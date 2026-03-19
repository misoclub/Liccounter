/**
 * アプリケーションのグローバル状態管理
 */
export const State = {
    isStarted: false,
    startDate: new Date(),
    timerId: 0,
    
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

    orderHistory: [], 
    lastChargeDate: new Date(),
    
    prices: {
        my: 0,
        cast: 0,
        shot: 0,
        other: 0,
        custom: {}, 
        endlessShimei: 0
    },

    presets: {
        editingId: null,
        count: 0,
        data: [],
        currentId: null // 現在選択中のお店ID
    },

    visibleFuture: false,

    waiveConfig: {
        lastRequiredCount: 0,
        isLatestSetWaived: false,
        isFirstSetWaived: false
    },

    get totalMoney() {
        return this.orderHistory.reduce((sum, item) => {
            const val = parseFloat(item.amount);
            return sum + (isNaN(val) ? 0 : val);
        }, 0);
    },

    countItem(name) {
        return this.orderHistory.filter(item => item.name === name).length;
    },

    reset() {
        this.isStarted = false;
        this.orderHistory = [];
        this.startDate = new Date();
        this.lastChargeDate = new Date();
        this.presets.editingId = null;
        // this.presets.currentId = null; // 入店時のリセットでは選択状態を解除しない
        this.settings.endlessJyonaiShimei = 0; // 永続指名フラグをリセット
        this.waiveConfig.lastRequiredCount = 0;
        this.waiveConfig.isLatestSetWaived = false;
        this.waiveConfig.isFirstSetWaived = false;
    }
};
