import _ from 'the-lodash';
import React, { FC } from 'react';
import { RuleEditor } from '@kubevious/ui-rule-engine'
import { BurgerMenu, Button } from '@kubevious/ui-components';

import { useRuleEditorActions } from '@kubevious/ui-rule-engine';

import ruleEngineStyles from '../rule-engine-styles.module.css';

export const RuleEditorInner: FC<{}> = ({}) => {

    const { burgerMenuItems, createNewItem } = useRuleEditorActions();

    return <div className={ruleEngineStyles.container}>
        <RuleEditor itemListHeader={
            <div className={ruleEngineStyles.siderHeader}>
                <Button type="success" onClick={createNewItem} spacingLeft>
                    Add New Rule
                </Button>

                <BurgerMenu items={burgerMenuItems} />
            </div>}
            />
    </div>

}
