/**
 * メインアプリケーション・エントリーポイント
 */
import { State } from './modules/state.js';
import { Utils } from './modules/utils.js';
import { Calculator } from './modules/calculator.js';
import { Storage } from './modules/storage.js';
import { UI } from './modules/ui.js';
import { CONSTANTS } from './modules/constants.js';

const App = {
    init() {
        this.loadInitialData();
        this.setupEventListeners();
        this.renderPresets();
        if (State.isStarted) this.resumeWork();
    },

    loadInitialData() {
        const saveData = Storage.load(0);
        if (saveData) {
            State.isStarted = !!saveData["liccounter_enable"];
            State.startDate = new Date(saveData["liccounter_time"]);
            if (saveData["liccounter_jsonText"]) {
                const history = JSON.parse(saveData["liccounter_jsonText"]);
                State.orderHistory = history.map(item => ({...item, date: new Date(item.date)}));
            }
        }
        const presetCountData = Storage.store.get(CONSTANTS.STORAGE_KEYS.PRESET_COUNT);
        if (presetCountData) {
            State.presets.count = presetCountData.presetCount;
            State.presets.data = [];
            for (let i = 1; i <= State.presets.count; i++) {
                const data = Storage.store.get(CONSTANTS.STORAGE_KEYS.PRESET_DATA_PREFIX + i);
                if (data) State.presets.data.push(data);
            }
        }
        this.updateLastChargeDate();
        UI.syncFormFromState();
        UI.updateAll();
    },

    setupEventListeners() {
        $('#start').click(() => this.startWork());
        $('#stop').click(() => this.stopWork());

        $('#startTimeEdit').change((e) => {
            const timeValue = e.target.value;
            if (!timeValue) return;
            const [hours, minutes] = timeValue.split(':');
            const newDate = new Date(State.startDate);
            newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            if (newDate > new Date()) {
                if (!confirm("入店時刻が未来になっていますがよろしいですか？")) {
                    UI.updateSettingsDisplay();
                    return;
                }
            }
            State.startDate = newDate;
            State.orderHistory = State.orderHistory.filter(item => 
                item.name !== CONSTANTS.ITEM_NAMES.FIRST_SET && 
                item.name !== CONSTANTS.ITEM_NAMES.NORMAL_SET &&
                item.name !== CONSTANTS.ITEM_NAMES.ENDLESS_SHIMEI
            );
            State.waiveConfig.isLatestSetWaived = false;
            State.waiveConfig.lastRequiredCount = 0;
            this.updateLastChargeDate();
            this.checkAutoCharge();
            UI.updateAll();
            Storage.save(0, State.isStarted);
        });

        $('#pro-drink').click(() => this.addDrinkFromInput('my', CONSTANTS.ITEM_NAMES.GUEST_DRINK, CONSTANTS.SUFFIX.CUP));
        $('#hino-drink').click(() => this.addDrinkFromInput('cast', CONSTANTS.ITEM_NAMES.CAST_DRINK, CONSTANTS.SUFFIX.CUP));
        $('#sp-drink').click(() => this.addDrinkFromInput('shot', CONSTANTS.ITEM_NAMES.SHOT, CONSTANTS.SUFFIX.CUP));
        $('#other-drink').click(() => this.addDrinkFromInput('other', CONSTANTS.ITEM_NAMES.OTHER_DRINK, CONSTANTS.SUFFIX.CUP));
        
        // --- その他項目の追加 ---
        $('#addCustomItem').click(() => {
            const itemName = $('#customItemSelect').val();
            const amount = Utils.checkZero($('#customItemAmount').val());
            // 価格を記憶
            State.prices.custom[itemName] = amount;
            this.addDrink(itemName, amount, new Date(), CONSTANTS.SUFFIX.COUNT);
        });

        // セレクトボックス切り替え時に価格を表示
        $('#customItemSelect').change((e) => {
            const itemName = e.target.value;
            const price = State.prices.custom[itemName] || 0;
            $('#customItemAmount').val(price);
        });

        // 価格入力変更時に記憶
        $('#customItemAmount').change((e) => {
            const itemName = $('#customItemSelect').val();
            State.prices.custom[itemName] = Utils.checkZero(e.target.value);
            Storage.save(0, State.isStarted);
        });

        $('#endless-jyonai-shimei').click(() => {
            const amount = Utils.checkZero($('#endless-jyonai-shimei-amount').val());
            State.settings.endlessJyonaiShimei = amount;
            this.addDrink(CONSTANTS.ITEM_NAMES.ENDLESS_SHIMEI, amount, new Date(), CONSTANTS.SUFFIX.NOMINATION);
            $('#endless-jyonai-shimei').prop('disabled', true);
        });

        const configInputs = ['#pro-amount', '#hino-amount', '#sp-amount', '#other-amount', '#endless-jyonai-shimei-amount', '#shopNameSetting', '#numSetting', '#firstTimeChargeTimeSetting', '#firstTimeChargeMoneySetting', '#chargeTimeSetting', '#chageSetting', '#taxSetting', '#otherSetting'];
        $(configInputs.join(',')).change(() => {
            this.syncStateFromForm();
            UI.updateAll();
            Storage.save(0, State.isStarted);
        });

        $('#save-preset').click(() => {
            this.syncStateFromForm();
            let targetId = State.presets.editingId;
            if (targetId === null) { State.presets.count++; targetId = State.presets.count; }
            Storage.save(targetId, false);
            alert("お店情報を保存しました。");
            location.reload();
        });

        $('#cacheclear').click(() => {
            if (confirm("保存してあるデータをすべて削除しますか？")) { Storage.store.clearAll(); location.reload(); }
        });

        $('#futureButton').click(() => {
            State.visibleFuture = !State.visibleFuture;
            $('#futureTable').toggle(State.visibleFuture);
            $('#futureButton').text(State.visibleFuture ? "お会計予報を非表示" : "お会計予報を表示");
        });

        $('input').focus(function() { $(this).select(); });
    },

    syncStateFromForm() {
        State.settings.shopName = $('#shopNameSetting').val() || "名無しのお店";
        State.settings.numPeople = Utils.checkZero($('#numSetting').val());
        State.settings.firstChargeTime = Utils.checkZero($('#firstTimeChargeTimeSetting').val());
        State.settings.firstChargeMoney = Utils.checkZero($('#firstTimeChargeMoneySetting').val());
        State.settings.chargeTime = Utils.checkZero($('#chargeTimeSetting').val());
        State.settings.chargeMoney = Utils.checkZero($('#chageSetting').val());
        State.settings.taxRate = Utils.checkZero($('#taxSetting').val());
        State.settings.initialCost = Utils.checkZero($('#otherSetting').val());
        State.prices.my = Utils.checkZero($('#pro-amount').val());
        State.prices.cast = Utils.checkZero($('#hino-amount').val());
        State.prices.shot = Utils.checkZero($('#sp-amount').val());
        State.prices.other = Utils.checkZero($('#other-amount').val());
        State.prices.endlessShimei = Utils.checkZero($('#endless-jyonai-shimei-amount').val());
        
        // カスタム価格も同期
        const currentItem = $('#customItemSelect').val();
        State.prices.custom[currentItem] = Utils.checkZero($('#customItemAmount').val());
    },

    renderPresets() {
        State.presets.data.forEach(preset => {
            if (!preset.enable) return;
            const button = $(`<div class="col"><button type="button" class="btn btn-secondary btn-lg btn-block">${preset.presetName}</button></div><div class="my-box mt-1"></div>`);
            button.find('button').click(() => {
                if ($('#myCheckbox').is(':checked')) {
                    const result = confirm(`${preset.presetName}を編集、または削除しますか？\n[OK]: 編集(読み込み) / [キャンセル]: 削除`);
                    if (result) {
                        Storage.load(preset.presetId);
                        State.presets.editingId = preset.presetId;
                        UI.syncFormFromState();
                        UI.updateSaveButton();
                        alert(`${preset.presetName}の設定を読み込みました。修正して保存すると上書きされます。`);
                    } else {
                        if (confirm("本当に削除しますか？")) {
                            const pData = { ...preset, enable: false };
                            Storage.store.set(CONSTANTS.STORAGE_KEYS.PRESET_DATA_PREFIX + preset.presetId, pData);
                            location.reload();
                        }
                    }
                } else {
                    Storage.load(preset.presetId);
                    State.presets.editingId = null; 
                    UI.syncFormFromState();
                    UI.updateAll();
                }
            });
            $('#presetButtonTarget').after(button);
        });
    },

    startWork() {
        if (State.isStarted) return;
        this.syncStateFromForm();
        if (State.settings.chargeTime <= 0) { alert("セット時間は0にできません"); return; }
        State.reset(); 
        this.syncStateFromForm();
        State.isStarted = true;
        State.startDate = new Date();
        if (State.settings.initialCost > 0) { this.addDrink(CONSTANTS.ITEM_NAMES.INITIAL_COST, State.settings.initialCost, State.startDate, "", false); }
        this.resumeWork();
        $('#start').hide(); $('#stop').show(); $('.ui_setting').hide(); $('.ui_runtime').show();
        Storage.save(0, true);
    },

    resumeWork() {
        const updateTick = () => {
            $('#timeText').text("滞在時間：" + Calculator.getPassTimeText(State.startDate));
            this.checkAutoCharge();
            $('#lastChaegeText').text("残り時間：" + Calculator.getLastTimeText(State.lastChargeDate));
            UI.updateMoneyDisplay();
        };
        updateTick();
        State.timerId = setInterval(updateTick, 1000);
        UI.updateAll();
        $('#start').hide(); $('#stop').show(); $('.ui_setting').hide(); $('.ui_runtime').show();
    },

    stopWork() {
        if (!confirm("お会計しますか？")) return;
        clearInterval(State.timerId);
        UI.updateAll(); 
        const { total } = Calculator.calculateTotalWithTax(State.totalMoney, State.settings.taxRate);
        alert(`お会計は ${total.toLocaleString()} 円でした。\n今日も楽しめましたか？`);
        State.reset(); 
        Storage.save(0, false);
        location.reload();
    },

    updateLastChargeDate() {
        let lastDate = new Date(State.startDate.getTime());
        State.orderHistory.forEach(item => {
            if (item.name === CONSTANTS.ITEM_NAMES.FIRST_SET) {
                const d = new Date(item.date);
                d.setTime(d.getTime() + (State.settings.firstChargeTime * 60 * 1000 + 1000));
                if (d > lastDate) lastDate = d;
            } else if (item.name === CONSTANTS.ITEM_NAMES.NORMAL_SET) {
                const d = new Date(item.date);
                d.setTime(d.getTime() + (State.settings.chargeTime * 60 * 1000 + 1000));
                if (d > lastDate) lastDate = d;
            }
        });
        State.lastChargeDate = lastDate;
    },

    checkAutoCharge() {
        const diffTime = Date.now() - State.startDate.getTime();
        let seconds = Math.floor(diffTime / 1000) + 1;
        if (State.settings.firstChargeTime > 0 && State.settings.firstChargeMoney > 0) {
            if (State.countItem(CONSTANTS.ITEM_NAMES.FIRST_SET) === 0) {
                const chargeDate = new Date(State.startDate.getTime());
                this.addDrink(CONSTANTS.ITEM_NAMES.FIRST_SET, State.settings.firstChargeMoney * State.settings.numPeople, chargeDate, CONSTANTS.SUFFIX.MINUTES);
            }
            seconds -= State.settings.firstChargeTime * 60;
        }
        const requiredSets = Math.max(0, Math.ceil(seconds / (60 * State.settings.chargeTime)));
        if (requiredSets > State.waiveConfig.lastRequiredCount) {
            State.waiveConfig.isLatestSetWaived = false;
            State.waiveConfig.lastRequiredCount = requiredSets;
        }
        const targetSets = State.waiveConfig.isLatestSetWaived ? requiredSets - 1 : requiredSets;
        const currentSets = State.countItem(CONSTANTS.ITEM_NAMES.NORMAL_SET);
        if (targetSets > currentSets) {
            for (let i = currentSets; i < targetSets; i++) {
                const chargeDate = new Date(State.startDate.getTime());
                chargeDate.setMinutes(chargeDate.getMinutes() + (State.settings.chargeTime * i) + State.settings.firstChargeTime);
                this.addDrink(CONSTANTS.ITEM_NAMES.NORMAL_SET, State.settings.chargeMoney * State.settings.numPeople, chargeDate, CONSTANTS.SUFFIX.MINUTES);
                if (State.settings.endlessJyonaiShimei > 0) {
                    this.addDrink(CONSTANTS.ITEM_NAMES.ENDLESS_SHIMEI, State.settings.endlessJyonaiShimei, chargeDate, CONSTANTS.SUFFIX.NOMINATION);
                }
            }
        }
        this.updateLastChargeDate();
        UI.updateFutureTable();
    },

    addDrink(name, amount, date, optionText, shouldSave = true) {
        State.orderHistory.push({ name, amount, date, optionText });
        UI.updateAll();
        if (shouldSave) Storage.save(0, State.isStarted);
    },

    addDrinkFromInput(priceKey, name, optionText) {
        const amount = Utils.checkZero($('#' + this.getPriceInputId(priceKey)).val());
        if (amount === 0 && !confirm("料金が0円ですが追加しますか？")) return;
        this.addDrink(name, amount, new Date(), optionText);
    },

    deleteHistoryItem(index) {
        const item = State.orderHistory[index];
        if (!item) return;
        if (confirm("この項目を削除しますか？")) {
            if (item.name === CONSTANTS.ITEM_NAMES.NORMAL_SET) {
                State.waiveConfig.isLatestSetWaived = true;
                const diffTime = Date.now() - State.startDate.getTime();
                let seconds = Math.floor(diffTime / 1000) + 1;
                if (State.settings.firstChargeTime > 0) seconds -= State.settings.firstChargeTime * 60;
                State.waiveConfig.lastRequiredCount = Math.max(0, Math.ceil(seconds / (60 * State.settings.chargeTime)));
            }
            State.orderHistory.splice(index, 1);
            this.updateLastChargeDate();
            UI.updateAll();
            Storage.save(0, State.isStarted);
        }
    },

    getPriceInputId(key) {
        const map = { my: 'pro-amount', cast: 'hino-amount', shot: 'sp-amount', other: 'other-amount' };
        return map[key];
    }
};

$(() => { window.App = App; App.init(); });
