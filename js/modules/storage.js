/**
 * ローカルストレージ（store.js）への保存・読込
 */
import { State } from './state.js';
import { Utils } from './utils.js';
import { CONSTANTS } from './constants.js';

export const Storage = {
    store: window.store,

    /**
     * 指定したプリセットIDのデータを読み込んで State を更新
     */
    load(presetId) {
        const saveData = this.store.get('liccounter_user_data' + presetId);
        
        if (!saveData) {
            const def = CONSTANTS.DEFAULTS;
            State.settings.chargeMoney = def.CHARGE_MONEY;
            State.settings.taxRate = def.TAX_RATE;
            State.settings.chargeTime = def.CHARGE_TIME;
            State.settings.initialCost = def.INITIAL_COST;
            State.settings.numPeople = def.NUM_PEOPLE;
            State.settings.shopName = def.SHOP_NAME;
            State.settings.firstChargeMoney = def.FIRST_CHARGE_MONEY;
            State.settings.firstChargeTime = def.FIRST_CHARGE_TIME;

            State.prices.my = def.PRICE_MY;
            State.prices.cast = def.PRICE_CAST;
            State.prices.shot = def.PRICE_SHOT;
            State.prices.other = def.PRICE_OTHER;
            State.prices.endlessShimei = def.PRICE_ENDLESS_SHIMEI;
            
            // カスタム価格の初期化
            State.prices.custom = { ...def.CUSTOM_PRICES };
            return null;
        }

        State.settings.chargeMoney = Utils.checkZero(saveData["liccounter_chageSetting"]);
        State.settings.taxRate = Utils.checkZero(saveData["liccounter_taxSetting"]);
        State.settings.chargeTime = Utils.checkZero(saveData["liccounter_chargeTimeSetting"]);
        State.settings.initialCost = Utils.checkZero(saveData["liccounter_otherSetting"]);
        State.settings.numPeople = Utils.checkZero(saveData["liccounter_numSetting"] || saveData["liccounter_numPeople"]);
        State.settings.shopName = saveData["liccounter_shopNameSetting"] || "";
        State.settings.firstChargeMoney = Utils.checkZero(saveData["liccounter_firstTimeChargeMoneySetting"]);
        State.settings.firstChargeTime = Utils.checkZero(saveData["liccounter_firstTimeChargeTimeSetting"]);

        State.prices.my = Utils.checkZero(saveData["price_my"]);
        State.prices.cast = Utils.checkZero(saveData["price_cast"]);
        State.prices.shot = Utils.checkZero(saveData["price_shot"]);
        State.prices.other = Utils.checkZero(saveData["price_other"]);
        State.prices.endlessShimei = Utils.checkZero(saveData["price_endless_shimei"]);
        
        // カスタム価格の読み込み（なければデフォルトから補完）
        State.prices.custom = saveData["price_custom"] || { ...CONSTANTS.DEFAULTS.CUSTOM_PRICES };

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
            price_endless_shimei: State.prices.endlessShimei,
            price_custom: State.prices.custom // 追加
        };

        this.store.set('liccounter_user_data' + presetId, saveData);

        if (presetId !== 0) {
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
