/**
 * ローカルストレージ（store.js）への保存・読込
 */
import { State } from './state.js';
import { Utils } from './utils.js';

export const Storage = {
    // NOTE: store.js がグローバルにある前提
    store: window.store,

    /**
     * 指定したプリセットIDのデータを読み込んで State を更新
     */
    load(presetId) {
        const saveData = this.store.get('liccounter_user_data' + presetId);
        if (!saveData) return null;

        State.settings.chargeMoney = Utils.checkZero(saveData["liccounter_chageSetting"]);
        State.settings.taxRate = Utils.checkZero(saveData["liccounter_taxSetting"]);
        State.settings.chargeTime = Utils.checkZero(saveData["liccounter_chargeTimeSetting"]);
        State.settings.initialCost = Utils.checkZero(saveData["liccounter_otherSetting"]);
        State.settings.numPeople = Utils.checkZero(saveData["liccounter_numPeople"] || saveData["liccounter_numSetting"]);
        State.settings.shopName = saveData["liccounter_shopNameSetting"] || "";
        State.settings.firstChargeMoney = Utils.checkZero(saveData["liccounter_firstTimeChargeMoneySetting"]);
        State.settings.firstChargeTime = Utils.checkZero(saveData["liccounter_firstTimeChargeTimeSetting"]);

        State.prices.my = Utils.checkZero(saveData["price_my"]);
        State.prices.cast = Utils.checkZero(saveData["price_cast"]);
        State.prices.shot = Utils.checkZero(saveData["price_shot"]);
        State.prices.other = Utils.checkZero(saveData["price_other"]);
        State.prices.shimei = Utils.checkZero(saveData["price_shimei"]);
        State.prices.endlessShimei = Utils.checkZero(saveData["price_endless_shimei"]);

        return saveData;
    },

    /**
     * 現在の State を保存
     */
    save(presetId, isEnable) {
        const saveData = {
            liccounter_time: State.startDate.getTime(),
            liccounter_enable: isEnable,
            liccounter_chageSetting: State.settings.chargeMoney,
            liccounter_taxSetting: State.settings.taxRate,
            liccounter_chargeTimeSetting: State.settings.chargeTime,
            liccounter_otherSetting: State.settings.initialCost,
            liccounter_numSetting: State.settings.numPeople,
            liccounter_shopNameSetting: State.settings.shopName,
            liccounter_firstTimeChargeMoneySetting: State.settings.firstChargeMoney,
            liccounter_firstTimeChargeTimeSetting: State.settings.firstChargeTime,
            liccounter_jsonText: JSON.stringify(State.orderHistory),
            price_my: State.prices.my,
            price_cast: State.prices.cast,
            price_shot: State.prices.shot,
            price_other: State.prices.other,
            price_shimei: State.prices.shimei,
            price_endless_shimei: State.prices.endlessShimei
        };

        this.store.set('liccounter_user_data' + presetId, saveData);

        if (presetId !== 0) {
            // プリセット情報の更新
            const presetCountData = { presetCount: State.presets.count };
            this.store.set('preset_ser_data_count', presetCountData);

            const presetData = {
                presetName: State.settings.shopName,
                presetId: presetId,
                enable: true
            };
            this.store.set('preset_ser_data' + presetId, presetData);
        }
    }
};
