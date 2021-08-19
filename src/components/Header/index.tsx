import React from "react"
import _ from "the-lodash"
import bugImg from "../../assets/header-btns/bug.svg"
import slackImg from "../../assets/header-btns/slack.svg"
import githubImg from "../../assets/header-btns/github.svg"
import { About } from "../About"
import { SearchPage } from "../Search"
import { Notifications } from "../Notifications"
import { ClassComponent } from "@kubevious/ui-framework"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faSpinner } from "@fortawesome/free-solid-svg-icons"
import moment from "moment"

import "./styles.scss"
import { IMiscService } from "@kubevious/ui-middleware"
import { GoldenLayoutWindowInfo } from "@kubevious/ui-components"
import { HeaderProps, HeaderState } from "./types"
import cx from "classnames"

import btnStyles from './btn-styles.module.css';

export class Header extends ClassComponent<HeaderProps, HeaderState, IMiscService> {
    constructor(props : HeaderProps | Readonly<HeaderProps>) {
        super(props, null, { kind: "misc" })

        this.state = {
            showSettings: false,
            isLoading: false,
            hasNotifications: false,
            time_machine_enabled: false,
            time_machine_target_date: null,
            visible_windows: {}
        }

        this.openAbout = this.openAbout.bind(this)
        this.openSearch = this.openSearch.bind(this)
        this.detectIsVisible = this.detectIsVisible.bind(this)
        this.renderSettings = this.renderSettings.bind(this)
        this.openNotifications = this.openNotifications.bind(this)
        this.deactivateTimemachine = this.deactivateTimemachine.bind(this)
        this.handleWindowVisibilityChange = this.handleWindowVisibilityChange.bind(this)

    }

    openAbout(): void {
        this.sharedState.set("popup_window", {
            title: "About",
        })

        this.service.fetchAbout((result) => {
            this.sharedState.set("popup_window", {
                title: "About",
                content: <About result={result} />,
            })
        })
    }

    openSearch(): void {
        this.sharedState.set("popup_window", {
            title: "Search",
            content: <SearchPage />,
        })
    }

    detectIsVisible(item: GoldenLayoutWindowInfo): boolean {
        if (this.state.visible_windows[item.id]) {
            return true;
        }
        return false;
    }

    openNotifications(): void {
        this.sharedState.set("popup_window", {
            title: "Notifications",
            content: <Notifications />,
        })
    }

    deactivateTimemachine(): void {
        this.sharedState.set("time_machine_enabled", false)
    }

    handleWindowVisibilityChange(windowInfo: GoldenLayoutWindowInfo) {
        const visible_windows = this.sharedState.get("visible_windows");
        if (this.detectIsVisible(windowInfo)) {
            delete visible_windows[windowInfo.id];
        } else {
            visible_windows[windowInfo.id] = true;
        }
        this.sharedState.set("visible_windows", visible_windows);
    }

    renderSettings(): JSX.Element {
        const { windows } = this.props

        const closableWindows = windows.filter(x => !x.skipClose);

        return (
            <div
                id="tool-windows-menu"
                className="settings-menu"
                onMouseEnter={() => this.setState({ showSettings: true })}
                onMouseLeave={() => this.setState({ showSettings: false })}
            >
                {closableWindows.map((
                    item
                ) => (
                    <span className="s-menu-item" key={item.id}>
                        <label
                            className="ccheck"
                            id={`toolWindowShowHideLabel${item.id}`}
                        >
                            {this.detectIsVisible(item) ? "Hide" : "Show"}{" "}
                            {item.title}
                            <input
                                type="checkbox"
                                tool-window-id={item.id}
                                defaultChecked={this.detectIsVisible(item)}
                                onChange={(e) =>
                                    this.handleWindowVisibilityChange(item)
                                }
                            />
                            <span className="checkmark" />
                        </label>
                    </span>
                ))}
            </div>
        )
    }

    componentDidMount() {

        this.subscribeToSharedState("visible_windows", (visible_windows) => {
            this.setState({
                visible_windows: visible_windows
            })
        });

        this.subscribeToSharedState("is_loading", (is_loading) => {
            this.setState({ isLoading: is_loading })
        })

        this.subscribeToSharedState(
            ["time_machine_enabled", "time_machine_target_date"],
            ({
                time_machine_enabled,
                time_machine_target_date,
            }: {
                time_machine_enabled: boolean
                time_machine_target_date: Date
            }) => {
                if (time_machine_enabled && time_machine_target_date) {
                    this.setState({
                        time_machine_enabled,
                        time_machine_target_date,
                    })
                } else {
                    this.setState({
                        time_machine_enabled: false,
                        time_machine_target_date: null,
                    })
                }
            }
        )

        this.subscribeToSharedState("notifications_info", (info) => {
            const hasNotifications =
                info && _.isNotNullOrUndefined(info.count) && info.count > 0
            this.setState({ hasNotifications: hasNotifications })
        })
    }

    render() {
        const {
            showSettings,
            hasNotifications,
            isLoading,
            time_machine_enabled,
            time_machine_target_date,
        } = this.state

        return (
            <div className="header">
                <a className="logo" href="/" />
                <div className="loading-icon">
                    {isLoading && <FontAwesomeIcon icon={faSpinner} spin />}
                </div>
                {time_machine_enabled && (
                    <div id="history-info" className="history-info">
                        <span>
                            Time Machine Active:{" "}
                            {moment(time_machine_target_date).format(
                                "MMM DD hh:mm:ss A"
                            )}
                        </span>
                        <button
                            className="button success deactivate"
                            onClick={this.deactivateTimemachine}
                        >
                            Deactivate
                        </button>
                    </div>
                )}
                <div className="actions">
                    {hasNotifications && (
                        <div className="btn-container">
                            <button
                                id="btnNotifications"
                                type="button"
                                className={cx(btnStyles.headerBtn, btnStyles.headerBtnNotifications )}
                                onClick={this.openNotifications}
                            ></button>
                            <span className={btnStyles.tooltiptext}>Notifications</span>
                        </div>
                    )}

                    <div className="btn-container">
                        <button
                            id="btnHeaderSearch"
                            type="button"
                            className={cx(btnStyles.headerBtn, btnStyles.headerBtnSearch )}
                            onClick={this.openSearch}
                        />
                        <span className={btnStyles.tooltiptext}>Object Search</span>
                    </div>

                    <div className="btn-container">
                        <button
                            className={cx(btnStyles.headerBtn, btnStyles.headerBtnSettings )}
                            onMouseEnter={() =>
                                this.setState({ showSettings: true })
                            }
                            onMouseLeave={() =>
                                this.setState({ showSettings: false })
                            }
                        />
                        {showSettings && this.renderSettings()}
                    </div>

                    <div className="btn-container">
                        <button
                            id="btnHeaderAbout"
                            type="button"
                            className={cx(btnStyles.headerBtn, btnStyles.headerBtnAbout )}
                            onClick={this.openAbout}
                        ></button>
                        <span className={btnStyles.tooltiptext}>About Kubevious</span>
                    </div>

                    <div className="btn-container">
                        <a
                            href="https://github.com/kubevious/kubevious/issues/new/choose"
                            target="_blank"
                            className={cx(btnStyles.headerBtn, btnStyles.headerBtnBug )}
                        >
                            <img src={bugImg} alt="bug" />
                        </a>
                        <span className={btnStyles.tooltiptext}>Report Issues</span>
                    </div>

                    <div className="btn-container">
                        <a
                            href="https://github.com/kubevious/kubevious"
                            target="_blank"
                            className={cx(btnStyles.headerBtn, btnStyles.headerBtnGithub )}
                        >
                            <img src={githubImg} alt="github" />
                        </a>
                        <span className={btnStyles.tooltiptext}>GitHub Project</span>
                    </div>

                    <div className="btn-container">
                        <a
                            href="https://kubevious.io/slack"
                            target="_blank"
                            className={cx(btnStyles.headerBtn, btnStyles.headerBtnSlack )}
                        >
                            <img src={slackImg} alt="slack" />
                        </a>
                        <span className={btnStyles.tooltiptext}>Slack Channel</span>
                    </div>
                </div>
            </div>
        )
    }
}
