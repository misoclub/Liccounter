/**
 * アプリケーション内で使用する定数
 */
export const CONSTANTS = {
    // 標準のデフォルト値
    DEFAULTS: {
        SHOP_NAME: "名無しのお店",
        NUM_PEOPLE: 1,
        FIRST_CHARGE_TIME: 0,
        FIRST_CHARGE_MONEY: 0,
        CHARGE_TIME: 50,
        CHARGE_MONEY: 3000,
        TAX_RATE: 20,
        INITIAL_COST: 0,
        PRICE_MY: 1000,
        PRICE_CAST: 1000,
        PRICE_SHOT: 1500,
        PRICE_OTHER: 3000,
        PRICE_SHIMEI: 2000,
        PRICE_ENDLESS_SHIMEI: 3000
    },
    ITEM_NAMES: {
        FIRST_SET: "初回セット料👯‍♀️：",
        NORMAL_SET: "セット料👯‍♀️：",
        INITIAL_COST: "初期費用💰",
        JYONAI_SHIMEI: "単発場内指名☝️：",
        ENDLESS_SHIMEI: "永続場内指名✌️：",
        GUEST_DRINK: "ゲスドリ🍺：",
        CAST_DRINK: "キャスドリ🍹：",
        SHOT: "ショット🥃：",
        OTHER_DRINK: "他ドリンク🥂："
    },
    SUFFIX: {
        MINUTES: "分",
        NOMINATION: "指名",
        CUP: "杯目"
    },
    STORAGE_KEYS: {
        USER_DATA_PREFIX: "liccounter_user_data",
        PRESET_COUNT: "preset_ser_data_count",
        PRESET_DATA_PREFIX: "preset_ser_data"
    }
};
