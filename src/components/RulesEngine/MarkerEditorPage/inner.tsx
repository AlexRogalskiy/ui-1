import _ from 'the-lodash';
import React, { FC } from 'react';
import { MarkerEditor } from '@kubevious/ui-rule-engine'
import { BurgerMenu, Button } from '@kubevious/ui-components';

import { useMarkerEditorActions } from '@kubevious/ui-rule-engine';

import ruleEngineStyles from '../rule-engine-styles.module.css';

export const MarkerEditorInner: FC<{}> = ({}) => {

    const { burgerMenuItems, createNewItem } = useMarkerEditorActions();

    return <div className={ruleEngineStyles.container}>
        <MarkerEditor itemListHeader={
            <div className={ruleEngineStyles.siderHeader}>
                <Button type="success" onClick={createNewItem} spacingLeft>
                    Add New Marker
                </Button>

                <BurgerMenu items={burgerMenuItems} />
            </div>}
            />
    </div>

}
