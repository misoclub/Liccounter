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
        // 現在のセッション読み込み
        const saveData = Storage.load(0);
        if (saveData) {
            State.isStarted = !!saveData["liccounter_enable"];
            State.startDate = new Date(saveData["liccounter_time"]);
            if (saveData["liccounter_jsonText"]) {
                const history = JSON.parse(saveData["liccounter_jsonText"]);
                State.orderHistory = history.map(item => ({...item, date: new Date(item.date)}));
            }
        }

        // 保存済みのお店リストの収集
        const presetCountData = Storage.get(CONSTANTS.STORAGE_KEYS.PRESET_COUNT);
        State.presets.data = [];
        if (presetCountData && presetCountData.presetCount) {
            State.presets.count = presetCountData.presetCount;
            for (let i = 1; i <= State.presets.count; i++) {
                const data = Storage.get(CONSTANTS.STORAGE_KEYS.PRESET_DATA_PREFIX + i);
                if (data) {
                    State.presets.data.push(data);
                }
            }
        }

        this.updateLastChargeDate();
        UI.syncFormFromState();
        this.updateCustomItemSelect();
        UI.updateAll();
    },

    updateCustomItemSelect() {
        const select = $('#customItemSelect');
        const currentVal = select.val();
        select.empty();
        Object.keys(State.prices.custom).forEach(name => {
            const item = State.prices.custom[name];
            if (item && item.visible !== false) {
                select.append($('<option></option>').val(name).text(name.replace('：', '')));
            }
        });
        if (currentVal && select.find(`option[value="${currentVal}"]`).length > 0) {
            select.val(currentVal);
        } else {
            select.trigger('change');
        }
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
                    UI.updateSettingsDisplay(); return;
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
        
        $('#addCustomItem').click(() => {
            const itemName = $('#customItemSelect').val();
            if (!itemName) return;
            const amount = Utils.checkZero($('#customItemAmount').val());
            if (State.prices.custom[itemName]) State.prices.custom[itemName].price = amount;
            this.addDrink(itemName, amount, new Date(), CONSTANTS.SUFFIX.COUNT);
        });

        $('#customItemSelect').change((e) => {
            const itemName = e.target.value;
            const item = State.prices.custom[itemName];
            $('#customItemAmount').val(item ? item.price : 0);
        });

        $('#customItemAmount').change((e) => {
            const itemName = $('#customItemSelect').val();
            if (itemName && State.prices.custom[itemName]) {
                State.prices.custom[itemName].price = Utils.checkZero(e.target.value);
                Storage.save(0, State.isStarted);
            }
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

        // 新規保存ボタン
        $('#save-preset').click(() => {
            this.syncStateFromForm();
            // IDはStorage.save内で自動採番されるので適当な値で渡す(isNew=true)
            Storage.save(999, false, true);
            alert("お店情報を保存しました。");
            location.reload();
        });

        $('#cacheclear').click(() => {
            if (confirm("保存してあるデータをすべて削除しますか？")) { Storage.clearAll(); location.reload(); }
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
        const currentItem = $('#customItemSelect').val();
        if (currentItem && State.prices.custom[currentItem]) {
            State.prices.custom[currentItem].price = Utils.checkZero($('#customItemAmount').val());
        }
    },

    renderPresets() {
        const target = $('#presetButtonTarget');
        target.empty();
        
        State.presets.data.forEach(preset => {
            if (!preset.enable) return;
            const container = $(`
                <div class="row mb-2 align-items-center no-gutters">
                    <div class="col-10">
                        <button type="button" class="btn btn-secondary btn-lg btn-block text-truncate py-3">${preset.presetName}</button>
                    </div>
                    <div class="col-2 pl-1">
                        <button type="button" class="btn btn-outline-info btn-block py-3 edit-btn" title="編集">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>
            `);
            container.find('.btn-secondary').click(() => {
                Storage.load(preset.presetId);
                UI.syncFormFromState();
                this.updateCustomItemSelect();
                UI.updateAll();
                window.scrollTo(0, 0);
            });
            container.find('.edit-btn').click(() => { window.location.href = `./edit.html?id=${preset.presetId}`; });
            target.append(container);
        });
    },

    startWork() {
        if (State.isStarted) return;
        this.syncStateFromForm();
        if (State.settings.chargeTime <= 0) { alert("セット時間は0にできません"); return; }
        State.reset(); this.syncStateFromForm();
        State.isStarted = true; State.startDate = new Date();
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
        clearInterval(State.timerId); UI.updateAll(); 
        const { total } = Calculator.calculateTotalWithTax(State.totalMoney, State.settings.taxRate);
        alert(`お会計は ${total.toLocaleString()} 円でした。\n今日も楽しめましたか？`);
        State.reset(); Storage.save(0, false); location.reload();
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
