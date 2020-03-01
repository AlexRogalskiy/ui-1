const Promise = require('the-promise');
const _ = require('the-lodash');
const mysql = require('mysql2');
const events = require('events');
const DateUtils = require('./date-utils');

class MySqlDriver
{
    constructor(logger)
    {
        this._logger = logger.sublogger("MySqlDriver");
        this._statementsSql = {};
        this._preparedStatements = {};
        this._connectEmitter = new events.EventEmitter();
    }

    get logger() {
        return this._logger;
    }

    get isConnected() {
        return _.isNotNullOrUndefined(this._connection);
    }

    connect()
    {
       return this._tryConnect();
    }

    onConnect(cb)
    {
        if (this.isConnected) {
            this._triggerCallback(cb);
        }
        this._connectEmitter.on('connect', () => {
            this._triggerCallback(cb);
        })
    }

    _triggerCallback(cb)
    {
        try
        {
            this._logger.info("[_triggerCallback]")

            setImmediate(() => {
                try
                {
                    var res = cb(this);
                    return Promise.resolve(res)
                        .then(() => {})
                        .catch(reason => {
                            this._logger.error("[_triggerCallback] Promise Failure: ", reason)
                        })
                    }
                    catch(error)
                    {
                        this._logger.error("[_triggerCallback] Exception: ", error);
                    }
            });
        }
        catch(error)
        {
            this._logger.error("[_triggerCallback] Exception2: ", error)
        }
    }

    registerStatement(id, sql)
    {
        this._statementsSql[id] = sql;
    }

    executeStatement(id, params)
    {
        return new Promise((resolve, reject) => {
            this.logger.silly("[executeStatement] executing: %s", id);
            // this.logger.info("[executeStatement] executing: %s", id, params);
            var statement = this._preparedStatements[id];
            if (!statement) {
                reject("NOT PREPARED: " + id);
                return;
            }

            params = this._massageParams(params);

            statement.execute(params, (err, results, fields) => {
                if (err) {
                    this.logger.error("[executeStatement] ERROR IN %s. ", id, err);
                    reject(err);
                    return;
                }
                // this.logger.info("[executeStatement] DONE: %s", id, results);
                resolve(results);
            });
        });
    }

    executeSql(sql, params)
    {
        return new Promise((resolve, reject) => {
            this.logger.silly("[executeSql] executing: %s", sql);
            this.logger.info("[executeSql] executing: %s", sql, params);

            if (!this._connection) {
                reject("NOT CONNECTED");
                return;
            }
            
            params = this._massageParams(params);

            this._connection.execute(sql, params, (err, results, fields) => {
                if (err) {
                    this.logger.error("[executeSql] ERROR IN \"%s\". ", sql, err);
                    reject(err);
                    return;
                }
                // this.logger.info("[executeSql] DONE: %s", sql, results);
                resolve(results);
            });
        });
    }

    _massageParams(params)
    {
        if (!params) {
            params = []
        } else {
            params = params.map(x => {
                if (_.isUndefined(x)) {
                    return null;
                }
                if (_.isPlainObject(x)) { // || _.isArray(x)
                    return _.stableStringify(x);
                }
                return x;
            })
        }
        this.logger.info("[_massageParams] final params: ", params);
        return params;
    }

    executeStatements(statements)
    {
        this.logger.info("[executeStatements] BEGIN. Count: %s", statements.length);

        // return this.executeInTransaction(() => {
            // this.logger.info("[executeStatements] Inside Tx");
            return Promise.parallel(statements, statement => {
                // this.logger.info("[executeStatements] exec:");
                return this.executeStatement(statement.id, statement.params);
            })
        // });
    }

    executeInTransaction(cb)
    {
        this.logger.info("[executeInTransaction] BEGIN");

        var connection = this._connection;
        return new Promise((resolve, reject) => {
            this.logger.info("[executeStatements] TX Started.");

            if (!connection) {
                reject(new Error("NOT CONNECTED"));
                return;
            }

            var rollback = (err) =>
            {
                this.logger.error("[executeStatements] Rolling Back.");
                connection.rollback(() => {
                    this.logger.error("[executeStatements] Rollback complete.");
                    reject(err);
                });
            }

            connection.beginTransaction((err) => {
                if (err) { 
                    reject(err);
                    return;
                }

                return Promise.resolve()
                    .then(() => cb(this))
                    .then(() => {
                        connection.commit((err) => {
                            if (err) {
                                this.logger.error("[executeStatements] TX Failed To Commit.");
                                rollback(err);
                            } else {
                                this.logger.info("[executeStatements] TX Completed.");
                                resolve();
                            }
                        });
                    })
                    .catch(reason => {
                        this.logger.error("[executeStatements] TX Failed.");
                        rollback(reason);
                    });
            });
        });

    }

    /** IMPL **/

    _tryConnect()
    {
        try
        {
            if (this._isConnecting) {
                return;
            }
            this._isConnecting = true;
    
            var connection = mysql.createConnection({
                host     : process.env.MYSQL_HOST,
                port     : process.env.MYSQL_PORT,
                user     : 'root',
                password : '',
                database : 'kubevious',
                timezone: 'Z'
            });

            connection.on('error', (err) => {
                this.logger.error('[_tryConnect] ON ERROR: %s', err.code);
                this._disconnect();
            });
    
            connection.connect((err) => {
                this._isConnecting = false;
    
                if (err) {
                    // this.logger.error('[_tryConnect] CODE=%s', err.code);
                    // this._disconnect();
                    return;
                }
               
                this.logger.info('[_tryConnect] connected as id: %s', connection.threadId);
                this._acceptConnection(connection);
            });
        }
        catch(err)
        {
            this._isConnecting = false;
            this._disconnect();
        }
    }

    _disconnect()
    {
        this._connection = null;
        this._preparedStatements = {};
        this._tryReconnect();
    }

    _acceptConnection(connection)
    {
        this._connection = connection;

        return Promise.resolve()
            .then(() => this._prepareStatements())
            .then(() => {
                this._connectEmitter.emit('connect');
            })
            .catch(reason => {
                this.logger.error('[_acceptConnection] failed: ', reason);
                return this._disconnect();
            })
        ;
    }

    _prepareStatements()
    {
        return Promise.serial(_.keys(this._statementsSql), id => {
            var sql = this._statementsSql[id];
            return this._prepareStatementNow(id, sql)
                .then(statement => {
                    this._preparedStatements[id] = statement;
                });
        })
    }

    _prepareStatementNow(id, sql)
    {
        return new Promise((resolve, reject) => {
            this._connection.prepare(sql, (err, statement) => {
                if (err)
                {
                    this.logger.error('[_prepareStatementNow] failed to prepare %s. ', id, err);
                    reject(err);
                    return;
                }
                this.logger.info('[_prepareStatementNow] prepared: %s. inner id: %s', id, statement.id);
                resolve(statement);
            });
        });
    }

    _tryReconnect()
    {
        setTimeout(this._tryConnect.bind(this), 1000);
    }

}

module.exports = MySqlDriver;