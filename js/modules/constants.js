/**
 * アプリケーション内で使用する定数
 */
export const CONSTANTS = {
    // 標準のデフォルト値
    DEFAULTS: {
        SHOP_NAME: "初めてのお店",
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
        PRICE_OTHER: 1500,
        // カスタム項目の初期値（価格と単位）
        CUSTOM_PRICES: {
            "同伴料🤝：": { price: 2000, suffix: "回" },
            "チェキ📸：": { price: 500, suffix: "枚" },
            "単発場内指名☝️：": { price: 2000, suffix: "指名" },
            "ハーフセット：": { price: 1500, suffix: "セット" },
            "シャンパン🍾：": { price: 15000, suffix: "本" },
            "ボトル🍾：": { price: 5000, suffix: "本" },
            "日本酒🍶：": { price: 9000, suffix: "本" },
            "テキーラ🌵：": { price: 1000, suffix: "杯" },
            "コカボム💣：": { price: 2000, suffix: "杯" },
            "クライナー🍾：": { price: 2000, suffix: "本" },
            "イエーガー🦌：": { price: 1000, suffix: "杯" },
            "カラオケ🎤：": { price: 1000, suffix: "曲" },
            "料理🍳：": { price: 1000, suffix: "品" },
            "その他：": { price: 1000, suffix: "" }
        },
        PRICE_ENDLESS_SHIMEI: 3000
    },
    ITEM_NAMES: {
        FIRST_SET: "初回セット料👯‍♀️：",
        NORMAL_SET: "セット料👯‍♀️：",
        INITIAL_COST: "初期費用💰",
        ENDLESS_SHIMEI: "永続場内指名✌️：",
        GUEST_DRINK: "ゲスドリ🍺：",
        CAST_DRINK: "キャスドリ🍹：",
        SHOT: "ゲストショット🥃：",
        OTHER_DRINK: "キャストショット🥃："
    },
    SUFFIX: {
        MINUTES: "分",
        NOMINATION: "指名",
        CUP: "杯",
        COUNT: "個" // デフォルト用
    },
    STORAGE_KEYS: {
        USER_DATA_PREFIX: "liccounter_user_data",
        PRESET_COUNT: "preset_ser_data_count",
        PRESET_DATA_PREFIX: "preset_ser_data"
    }
};
