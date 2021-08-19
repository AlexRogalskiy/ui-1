import _ from 'the-lodash';
import { ClassComponent } from '@kubevious/ui-framework';
import { MarkerEditorInner } from './inner';

import ruleEngineStyles from '../rule-engine-styles.module.css';

export class MarkerEditorPage extends ClassComponent<{}, {}> {

    render() {
        return <div className={ruleEngineStyles.container}>
            <MarkerEditorInner />
        </div>
    }
}
