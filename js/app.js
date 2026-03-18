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
    /**
     * アプリの初期化
     */
    init() {
        this.loadInitialData();
        this.setupEventListeners();
        this.renderPresets();
        
        // すでに開始している場合の復元処理
        if (State.isStarted) {
            this.resumeWork();
        }
    },

    /**
     * 初期データの読み込み
     */
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

        // プリセット情報の読み込み
        const presetCountData = Storage.store.get(CONSTANTS.STORAGE_KEYS.PRESET_COUNT);
        if (presetCountData) {
            State.presets.count = presetCountData.presetCount;
            State.presets.data = [];
            for (let i = 1; i <= State.presets.count; i++) {
                const data = Storage.store.get(CONSTANTS.STORAGE_KEYS.PRESET_DATA_PREFIX + i);
                if (data) State.presets.data.push(data);
            }
        }

        UI.syncFormFromState();
        UI.updateAll();
    },

    /**
     * イベントリスナーの設定
     */
    setupEventListeners() {
        // 開始・終了ボタン
        $('#start').click(() => this.startWork());
        $('#stop').click(() => this.stopWork());

        // 入店時刻の変更
        $('#startTimeEdit').change((e) => {
            const timeValue = e.target.value; // "HH:mm"
            if (!timeValue) return;

            const [hours, minutes] = timeValue.split(':');
            const newDate = new Date(State.startDate);
            newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            
            // 未来の時刻にならないようにチェック（簡易的）
            if (newDate > new Date()) {
                if (!confirm("入店時刻が未来になっていますがよろしいですか？")) {
                    UI.updateSettingsDisplay(); // 元に戻す
                    return;
                }
            }

            State.startDate = newDate;
            
            // 入店時刻が変わったので、自動セット料金の再チェックが必要
            this.checkAutoCharge();
            UI.updateAll();
            Storage.save(0, State.isStarted);
        });

        // ドリンク追加ボタン
        $('#pro-drink').click(() => this.addDrinkFromInput('my', CONSTANTS.ITEM_NAMES.GUEST_DRINK, CONSTANTS.SUFFIX.CUP));
        $('#hino-drink').click(() => this.addDrinkFromInput('cast', CONSTANTS.ITEM_NAMES.CAST_DRINK, CONSTANTS.SUFFIX.CUP));
        $('#sp-drink').click(() => this.addDrinkFromInput('shot', CONSTANTS.ITEM_NAMES.SHOT, CONSTANTS.SUFFIX.CUP));
        $('#other-drink').click(() => this.addDrinkFromInput('other', CONSTANTS.ITEM_NAMES.OTHER_DRINK, CONSTANTS.SUFFIX.CUP));
        $('#jyonai-shimei').click(() => this.addDrinkFromInput('shimei', CONSTANTS.ITEM_NAMES.JYONAI_SHIMEI, CONSTANTS.SUFFIX.NOMINATION));
        
        $('#endless-jyonai-shimei').click(() => {
            const amount = Utils.checkZero($('#endless-jyonai-shimei-amount').val());
            State.settings.endlessJyonaiShimei = amount;
            this.addDrink(CONSTANTS.ITEM_NAMES.ENDLESS_SHIMEI, amount, new Date(), CONSTANTS.SUFFIX.NOMINATION);
            $('#endless-jyonai-shimei').prop('disabled', true);
        });

        // 設定変更時の自動保存
        const configInputs = [
            '#pro-amount', '#hino-amount', '#sp-amount', '#other-amount', 
            '#jyonai-shimei-amount', '#endless-jyonai-shimei-amount'
        ];
        $(configInputs.join(',')).change(() => {
            this.syncStateFromForm();
            Storage.save(0, State.isStarted);
        });

        // プリセット保存
        $('#save-preset').click(() => {
            State.presets.count++;
            this.syncStateFromForm();
            Storage.save(State.presets.count, false);
            alert("お店情報を保存しました。");
            location.reload();
        });

        // キャッシュクリア
        $('#cacheclear').click(() => {
            if (confirm("保存してあるデータをすべて削除しますか？")) {
                Storage.store.clearAll();
                location.reload();
            }
        });

        // 未来予報表示切り替え
        $('#futureButton').click(() => {
            State.visibleFuture = !State.visibleFuture;
            $('#futureTable').toggle(State.visibleFuture);
            $('#futureButton').text(State.visibleFuture ? "お会計予報を非表示" : "お会計予報を表示");
        });

        // フォーカス時に全選択
        $('input').focus(function() { $(this).select(); });
    },

    /**
     * フォームから State への同期
     */
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
        State.prices.shimei = Utils.checkZero($('#jyonai-shimei-amount').val());
        State.prices.endlessShimei = Utils.checkZero($('#endless-jyonai-shimei-amount').val());
    },

    /**
     * プリセットボタンの描画
     */
    renderPresets() {
        State.presets.data.forEach(preset => {
            if (!preset.enable) return;

            const button = $(`
                <div class="col">
                    <button type="button" class="btn btn-secondary btn-lg btn-block">${preset.presetName}</button>
                </div>
                <div class="my-box mt-1"></div>
            `);

            button.find('button').click(() => {
                if ($('#myCheckbox').is(':checked')) {
                    const pData = { ...preset, enable: false };
                    Storage.store.set(CONSTANTS.STORAGE_KEYS.PRESET_DATA_PREFIX + preset.presetId, pData);
                    location.reload();
                } else {
                    Storage.load(preset.presetId);
                    UI.syncFormFromState();
                    UI.updateAll();
                }
            });

            $('#presetButtonTarget').after(button);
        });
    },

    /**
     * 業務開始
     */
    startWork() {
        if (State.isStarted) return;
        
        this.syncStateFromForm();

        if (State.settings.chargeTime <= 0) {
            alert("セット時間は0にできません");
            return;
        }

        State.isStarted = true;
        State.startDate = new Date();
        
        // 初期費用の追加
        if (State.settings.initialCost > 0) {
            this.addDrink(CONSTANTS.ITEM_NAMES.INITIAL_COST, State.settings.initialCost, State.startDate, "", false);
        }

        this.resumeWork();
        
        $('#start').hide();
        $('#stop').show();
        $('.ui_setting').hide();
        $('.ui_runtime').show();
        
        Storage.save(0, true);
    },

    /**
     * 再開処理（タイマー開始）
     */
    resumeWork() {
        const updateTick = () => {
            $('#timeText').text("滞在時間：" + Calculator.getPassTimeText(State.startDate));
            this.checkAutoCharge();
            $('#lastChaegeText').text("残り時間：" + Calculator.getLastTimeText(State.lastChargeDate));
        };

        updateTick();
        State.timerId = setInterval(updateTick, 1000);
        
        UI.updateAll();

        $('#start').hide();
        $('#stop').show();
        $('.ui_setting').hide();
        $('.ui_runtime').show();
    },

    /**
     * 業務終了
     */
    stopWork() {
        if (!confirm("お会計しますか？")) return;

        clearInterval(State.timerId);
        State.isStarted = false;

        const { total } = Calculator.calculateTotalWithTax(State.totalMoney, State.settings.taxRate);
        alert(`お会計は ${total.toLocaleString()} 円でした。\n今日も楽しめましたか？`);

        Storage.save(0, false);
        
        $('#stop').hide();
        $('#menu_button_1, #menu_button_2').hide();
        $('#resultDownload').show();
    },

    /**
     * 自動セット料金追加のチェック
     */
    checkAutoCharge() {
        const diffTime = Date.now() - State.startDate.getTime();
        let seconds = Math.floor(diffTime / 1000) + 1;

        // 初回セットのチェック
        if (State.settings.firstChargeTime > 0 && State.settings.firstChargeMoney > 0) {
            if (State.countItem(CONSTANTS.ITEM_NAMES.FIRST_SET) === 0) {
                const chargeDate = new Date(State.startDate.getTime());
                this.addDrink(CONSTANTS.ITEM_NAMES.FIRST_SET, State.settings.firstChargeMoney * State.settings.numPeople, chargeDate, CONSTANTS.SUFFIX.MINUTES);
                
                chargeDate.setTime(chargeDate.getTime() + (State.settings.firstChargeTime * 60 * 1000 + 1000));
                State.lastChargeDate = chargeDate;
            }
            seconds -= State.settings.firstChargeTime * 60;
        }

        // 延長セットのチェック
        const requiredSets = Math.ceil(seconds / (60 * State.settings.chargeTime));
        const currentSets = State.countItem(CONSTANTS.ITEM_NAMES.NORMAL_SET);
        
        if (requiredSets > currentSets) {
            for (let i = currentSets; i < requiredSets; i++) {
                const chargeDate = new Date(State.startDate.getTime());
                chargeDate.setMinutes(chargeDate.getMinutes() + (State.settings.chargeTime * i) + State.settings.firstChargeTime);
                
                this.addDrink(CONSTANTS.ITEM_NAMES.NORMAL_SET, State.settings.chargeMoney * State.settings.numPeople, chargeDate, CONSTANTS.SUFFIX.MINUTES);

                if (State.settings.endlessJyonaiShimei > 0) {
                    this.addDrink(CONSTANTS.ITEM_NAMES.ENDLESS_SHIMEI, State.settings.endlessJyonaiShimei, chargeDate, CONSTANTS.SUFFIX.NOMINATION);
                }

                chargeDate.setTime(chargeDate.getTime() + (State.settings.chargeTime * 60 * 1000 + 1000));
                State.lastChargeDate = chargeDate;
            }
            UI.updateFutureTable();
        }
    },

    /**
     * 飲み物・項目の追加
     */
    addDrink(name, amount, date, optionText, shouldSave = true) {
        State.orderHistory.push({ name, amount, date, optionText });

        UI.updateMoneyDisplay();
        UI.updateHistoryTable();
        UI.updateFutureTable();

        if (shouldSave) {
            Storage.save(0, State.isStarted);
        }
    },

    /**
     * 入力フォームから飲み物を追加
     */
    addDrinkFromInput(priceKey, name, optionText) {
        const amount = Utils.checkZero($('#' + this.getPriceInputId(priceKey)).val());
        if (amount === 0 && !confirm("料金が0円ですが追加しますか？")) return;
        this.addDrink(name, amount, new Date(), optionText);
    },

    getPriceInputId(key) {
        const map = {
            my: 'pro-amount',
            cast: 'hino-amount',
            shot: 'sp-amount',
            other: 'other-amount',
            shimei: 'jyonai-shimei-amount'
        };
        return map[key];
    }
};

// 初期化実行
$(() => {
    window.App = App;
    App.init();
});
