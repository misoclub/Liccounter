/**
 * アプリケーションのグローバル状態管理
 */
export const State = {
    isStarted: false,
    startDate: new Date(),
    timerId: 0,
    
    // 設定
    settings: {
        chargeTime: 0,
        chargeMoney: 0,
        endlessJyonaiShimei: 0,
        taxRate: 0,
        initialCost: 0,
        numPeople: 0,
        shopName: "",
        firstChargeMoney: 0,
        firstChargeTime: 0
    },

    // 注文履歴
    orderHistory: [], 
    lastChargeDate: new Date(),
    
    // 飲食物の単価設定
    prices: {
        my: 0,
        cast: 0,
        shot: 0,
        other: 0,
        shimei: 0,
        endlessShimei: 0
    },

    // プリセット関連
    presets: {
        editingId: null,
        count: 0,
        data: []
    },

    visibleFuture: false,

    /**
     * 合計金額を履歴から算出
     */
    get totalMoney() {
        return this.orderHistory.reduce((sum, item) => {
            const val = parseFloat(item.amount);
            return sum + (isNaN(val) ? 0 : val);
        }, 0);
    },

    /**
     * 特定のアイテムが履歴に何回出たかカウント
     */
    countItem(name) {
        return this.orderHistory.filter(item => item.name === name).length;
    },

    /**
     * 状態のリセット
     */
    reset() {
        this.isStarted = false;
        this.orderHistory = [];
        this.startDate = new Date();
        this.lastChargeDate = new Date();
        this.presets.editingId = null;
    }
};
