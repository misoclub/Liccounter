/**
 * ローカルストレージ（store.js）への保存・読込
 */
import { State } from './state.js';
import { Utils } from './utils.js';
import { CONSTANTS } from './constants.js';

export const Storage = {
    get(key) {
        if (window.store && typeof window.store.get === 'function') {
            return window.store.get(key);
        }
        const val = localStorage.getItem(key);
        if (!val) return null;
        try { return JSON.parse(val); } catch (e) { return val; }
    },

    set(key, value) {
        if (window.store && typeof window.store.set === 'function') {
            window.store.set(key, value);
            return;
        }
        const val = (typeof value === 'object') ? JSON.stringify(value) : value;
        localStorage.setItem(key, val);
    },

    clearAll() {
        if (window.store && typeof window.store.clearAll === 'function') {
            window.store.clearAll();
        } else {
            localStorage.clear();
        }
    },

    load(presetId) {
        const saveData = this.get('liccounter_user_data' + presetId);
        
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
            
            State.prices.custom = {};
            Object.keys(def.CUSTOM_PRICES).forEach(name => {
                const itemDef = def.CUSTOM_PRICES[name];
                State.prices.custom[name] = { 
                    price: itemDef.price, 
                    suffix: itemDef.suffix,
                    visible: true 
                };
            });

            if (presetId === 0) State.presets.currentId = null;

            return null;
        }

        if (presetId === 0) {
            State.presets.currentId = saveData["origin_preset_id"] || null;
        }

        State.settings.chargeMoney = Utils.checkZero(saveData["liccounter_chageSetting"]);
        State.settings.taxRate = Utils.checkZero(saveData["liccounter_taxSetting"]);
        State.settings.chargeTime = Utils.checkZero(saveData["liccounter_chargeTimeSetting"]);
        State.settings.initialCost = Utils.checkZero(saveData["liccounter_otherSetting"]);
        State.settings.numPeople = Utils.checkZero(saveData["liccounter_numSetting"] || saveData["liccounter_numPeople"]);
        State.settings.shopName = saveData["liccounter_shopNameSetting"] || "";
        State.settings.firstChargeMoney = Utils.checkZero(saveData["liccounter_firstTimeChargeMoneySetting"]);
        State.settings.firstChargeTime = Utils.checkZero(saveData["liccounter_firstTimeChargeTimeSetting"]);

        // 削除フラグ状態の復元
        if (saveData["liccounter_waiveConfig"]) {
            try {
                const waived = JSON.parse(saveData["liccounter_waiveConfig"]);
                State.waiveConfig = { ...State.waiveConfig, ...waived };
            } catch(e) {}
        }

        State.prices.my = Utils.checkZero(saveData["price_my"]);
        State.prices.cast = Utils.checkZero(saveData["price_cast"]);
        State.prices.shot = Utils.checkZero(saveData["price_shot"]);
        State.prices.other = Utils.checkZero(saveData["price_other"]);
        State.prices.endlessShimei = Utils.checkZero(saveData["price_endless_shimei"]);
        
        const loadedCustom = saveData["price_custom"] || {};
        State.prices.custom = {};

        Object.keys(CONSTANTS.DEFAULTS.CUSTOM_PRICES).forEach(name => {
            const item = loadedCustom[name];
            const defItem = CONSTANTS.DEFAULTS.CUSTOM_PRICES[name];
            if (item && typeof item === 'object') {
                State.prices.custom[name] = {
                    price: Utils.checkZero(item.price),
                    suffix: item.suffix !== undefined ? item.suffix : defItem.suffix,
                    visible: item.visible !== undefined ? item.visible : true
                };
            } else if (typeof item === 'number') {
                State.prices.custom[name] = { price: item, suffix: defItem.suffix, visible: true };
            } else {
                State.prices.custom[name] = { price: defItem.price, suffix: defItem.suffix, visible: true };
            }
        });

        Object.keys(loadedCustom).forEach(name => {
            if (!State.prices.custom[name]) {
                const item = loadedCustom[name];
                State.prices.custom[name] = typeof item === 'object' 
                    ? { price: Utils.checkZero(item.price), suffix: item.suffix || "", visible: item.visible }
                    : { price: Utils.checkZero(item), suffix: "", visible: true };
            }
        });

        return saveData;
    },

    save(presetId, isEnable, isNew = false) {
        if (presetId != 0 && isNew) {
            const countData = this.get('preset_ser_data_count') || { presetCount: 0 };
            const newCount = countData.presetCount + 1;
            this.set('preset_ser_data_count', { presetCount: newCount });
            presetId = newCount;
        }

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
            // 削除フラグ状態も保存（リロード対策）
            liccounter_waiveConfig: JSON.stringify(State.waiveConfig),
            price_my: State.prices.my,
            price_cast: State.prices.cast,
            price_shot: State.prices.shot,
            price_other: State.prices.other,
            price_endless_shimei: State.prices.endlessShimei,
            price_custom: State.prices.custom,
            origin_preset_id: State.presets.currentId
        };

        this.set('liccounter_user_data' + presetId, saveData);

        if (presetId != 0) {
            this.set('preset_ser_data' + presetId, {
                presetName: State.settings.shopName,
                presetId: presetId,
                enable: true
            });
        }
    },

    getAllData() {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('liccounter') || key.startsWith('preset')) {
                data[key] = this.get(key);
            }
        }
        return data;
    },

    importAllData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            // キーのバリデーション（簡易）
            if (typeof data !== 'object') return false;
            
            this.clearAll();
            Object.keys(data).forEach(key => {
                this.set(key, data[key]);
            });
            return true;
        } catch (e) {
            console.error("Import error:", e);
            return false;
        }
    }
};
