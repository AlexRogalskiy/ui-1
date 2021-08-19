import _ from 'the-lodash';
import { ClassComponent } from '@kubevious/ui-framework';
import { RuleEditorInner } from './inner';

import ruleEngineStyles from '../rule-engine-styles.module.css';

export class RuleEditorPage extends ClassComponent<{}, {}> {

    render() {
        return <div className={ruleEngineStyles.container}>
            <RuleEditorInner />
        </div>
    }
}
