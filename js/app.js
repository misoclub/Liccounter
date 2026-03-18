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
            
            const now = new Date();
            const inputHours = parseInt(hours, 10);
            const inputMinutes = parseInt(minutes, 10);
            
            // 営業日の基準日を計算（朝9時切り替え）
            const businessDate = new Date(now);
            if (now.getHours() < 9) {
                businessDate.setDate(businessDate.getDate() - 1);
            }
            
            const newDate = new Date(businessDate);
            if (inputHours >= 9) {
                newDate.setHours(inputHours, inputMinutes, 0, 0);
            } else {
                newDate.setDate(newDate.getDate() + 1);
                newDate.setHours(inputHours, inputMinutes, 0, 0);
            }

            if (newDate > now) {
                if (!confirm("入店時刻が現在より未来になっていますがよろしいですか？")) {
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
            State.waiveConfig.isFirstSetWaived = false;
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

        // 入店時刻の編集アイコンをクリックしたときに時刻選択を開く
        $('.edit-start-time').click(() => {
            const input = document.getElementById('startTimeEdit');
            if (input.showPicker) {
                input.showPicker();
            } else {
                input.click();
            }
        });

        $('#save-preset').click(() => {
            this.syncStateFromForm();
            Storage.save(999, false, true);
            alert("お店情報を保存しました。");
            location.reload();
        });

        $('#cacheclear').click(() => {
            if (confirm("保存してあるデータをすべて削除しますか？")) { Storage.clearAll(); location.reload(); }
        });

        $('#export-json').click((e) => {
            e.preventDefault();
            const data = Storage.getAllData();
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const now = new Date();
            const filename = `liccounter_backup_${Utils.dateToStr(now, 'YYYYMMDD_hhmm')}.json`;
            
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            
            // モバイル環境で確実に動作させるため、削除を少し遅らせる
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 500);
        });

        $('#import-json').click((e) => {
            e.preventDefault();
            $('#import-file').click();
        });

        $('#import-file').change((e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target.result;
                if (confirm("現在の全てのデータが上書きされます。よろしいですか？")) {
                    if (Storage.importAllData(content)) {
                        alert("インポートが完了しました。ページを再読み込みします。");
                        location.reload();
                    } else {
                        alert("インポートに失敗しました。ファイル形式が正しいか確認してください。");
                    }
                }
                // ファイル入力をリセット（同じファイルを再度選択できるように）
                $(e.target).val('');
            };
            reader.readAsText(file);
        });

        $('#futureButton').click(() => {
            State.visibleFuture = !State.visibleFuture;
            $('#futureTable').toggle(State.visibleFuture);
            $('#futureButton').text(State.visibleFuture ? "お会計予報を非表示" : "お会計予報を表示");
        });

        $('#backToTop').click(() => {
            State.reset();
            Storage.save(0, false);
            location.reload();
        });

        $('#resultDownload').click(() => {
            let resultText = `${State.settings.shopName}\n`;
            resultText += `入店時刻: ${Utils.dateToStr(State.startDate, 'YYYY/MM/DD(WW) hh:mm')}\n`;
            resultText += `--------------------\n`;

            State.orderHistory.forEach(item => {
                const timeStr = Utils.dateToStr(new Date(item.date), "hh:mm");
                let nameStr = item.name.replace('：', '');
                if (item.optionText && item.optionText !== CONSTANTS.SUFFIX.MINUTES) {
                    nameStr += ` (${item.optionText})`;
                }
                resultText += `${timeStr} - ${nameStr}: ${item.amount}円\n`;
            });

            resultText += `--------------------\n`;
            const { total, tax } = Calculator.calculateTotalWithTax(State.totalMoney, State.settings.taxRate);
            resultText += `小計: ${State.totalMoney}円\n`;
            resultText += `TAX(${State.settings.taxRate}%): ${tax}円\n`;
            resultText += `合計: ${total}円\n`;

            // 文字化け対策：UTF-8のBOM（\uFEFF）を付与
            const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
            const blob = new Blob([bom, resultText], { type: 'text/plain;charset=utf-8' });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            const filename = `${Utils.dateToStr(State.startDate, 'YYYYMMDD_hhmm')}_${State.settings.shopName || 'お会計記録'}.txt`;
            a.download = filename;

            document.body.appendChild(a);
            a.click();

            // モバイル環境での確実な動作のため、削除を少し遅らせる
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 500);
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
                        <button type="button" class="btn btn-secondary btn-lg btn-block text-truncate py-3 preset-btn" data-preset-id="${preset.presetId}">${preset.presetName}</button>
                    </div>
                    <div class="col-2 pl-1">
                        <button type="button" class="btn btn-outline-info btn-block py-3 edit-btn" title="編集">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>
            `);
            container.find('.preset-btn').click(() => {
                Storage.load(preset.presetId);
                State.presets.currentId = preset.presetId; // 選択したお店のIDを記憶
                UI.syncFormFromState();
                this.updateCustomItemSelect();
                UI.updateAll();
                this.updatePresetHighlight();
                Storage.save(0, State.isStarted); // 現在のセッション(0)を保存して引き継ぐ
                window.scrollTo(0, 0);
            });
            container.find('.edit-btn').click(() => { window.location.href = `./edit.html?id=${preset.presetId}`; });
            target.append(container);
        });

        // 初回ロード時のハイライト状態を反映
        this.updatePresetHighlight();
    },

    /**
     * 選択中のお店のボタンの色を変更する
     */
    updatePresetHighlight() {
        $('.preset-btn').each(function() {
            const id = $(this).data('preset-id');
            if (id == State.presets.currentId) {
                $(this).removeClass('btn-secondary').addClass('preset-active');
            } else {
                $(this).removeClass('preset-active').addClass('btn-secondary');
            }
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

        // 値が変更されているかチェックし、上書き保存を提案
        if (State.presets.currentId && this.hasSettingsChanged(State.presets.currentId)) {
            const presetName = State.presets.data.find(p => p.presetId === State.presets.currentId)?.presetName || "このお店";
            if (confirm(`ドリンクの値段等の設定が「${presetName}」の保存内容から変更されています。\n変更した内容を上書き保存しますか？`)) {
                Storage.save(State.presets.currentId, false, false);
                alert("上書き保存しました。");
            }
        }

        State.isStarted = false; 
        Storage.save(0, false); 
        
        // お会計後は画面をリロードせず、結果保存・トップへ戻るボタンを表示する
        $('#stop').hide();
        $('#resultDownload').show();
        $('#backToTop').show();
    },

    /**
     * 現在のフォーム入力値が、保存されているお店データから変更されているかチェックする
     */
    hasSettingsChanged(presetId) {
        const savedData = Storage.get('liccounter_user_data' + presetId);
        if (!savedData) return true; // 保存データがなければ変更ありとみなす

        const s = State.settings;
        const p = State.prices;

        // 基本設定の比較
        if (Utils.checkZero(savedData["liccounter_chageSetting"]) !== s.chargeMoney) return true;
        if (Utils.checkZero(savedData["liccounter_taxSetting"]) !== s.taxRate) return true;
        if (Utils.checkZero(savedData["liccounter_chargeTimeSetting"]) !== s.chargeTime) return true;
        if (Utils.checkZero(savedData["liccounter_otherSetting"]) !== s.initialCost) return true;
        if (Utils.checkZero(savedData["liccounter_firstTimeChargeMoneySetting"]) !== s.firstChargeMoney) return true;
        if (Utils.checkZero(savedData["liccounter_firstTimeChargeTimeSetting"]) !== s.firstChargeTime) return true;
        
        // 基本ドリンクの比較
        if (Utils.checkZero(savedData["price_my"]) !== p.my) return true;
        if (Utils.checkZero(savedData["price_cast"]) !== p.cast) return true;
        if (Utils.checkZero(savedData["price_shot"]) !== p.shot) return true;
        if (Utils.checkZero(savedData["price_other"]) !== p.other) return true;
        if (Utils.checkZero(savedData["price_endless_shimei"]) !== p.endlessShimei) return true;

        // カスタム項目の価格比較
        const loadedCustom = savedData["price_custom"] || {};
        const currentCustomKeys = Object.keys(p.custom);
        
        for (const key of currentCustomKeys) {
            const currentItem = p.custom[key];
            const loadedItem = loadedCustom[key];
            if (!loadedItem) return true; // 新しく追加された項目がある場合
            
            const loadedPrice = typeof loadedItem === 'object' ? Utils.checkZero(loadedItem.price) : Utils.checkZero(loadedItem);
            if (loadedPrice !== currentItem.price) return true;
        }

        return false;
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
            if (State.countItem(CONSTANTS.ITEM_NAMES.FIRST_SET) === 0 && !State.waiveConfig.isFirstSetWaived) {
                const chargeDate = new Date(State.startDate.getTime());
                this.addDrink(CONSTANTS.ITEM_NAMES.FIRST_SET, State.settings.firstChargeMoney * State.settings.numPeople, chargeDate, CONSTANTS.SUFFIX.MINUTES);
            }
            seconds -= State.settings.firstChargeTime * 60;
        }
        const requiredSets = Math.max(0, Math.ceil(seconds / (60 * State.settings.chargeTime)));
        if (requiredSets > State.waiveConfig.lastRequiredCount) {
            State.waiveConfig.isLatestSetWaived = false;
            State.waiveConfig.isFirstSetWaived = false;
            State.waiveConfig.lastRequiredCount = requiredSets;
        }
        
        const currentSets = State.countItem(CONSTANTS.ITEM_NAMES.NORMAL_SET);
        const targetSets = State.waiveConfig.isLatestSetWaived ? Math.min(requiredSets - 1, currentSets) : requiredSets;
        
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
            if (item.name === CONSTANTS.ITEM_NAMES.NORMAL_SET || item.name === CONSTANTS.ITEM_NAMES.FIRST_SET) {
                if (item.name === CONSTANTS.ITEM_NAMES.NORMAL_SET) {
                    State.waiveConfig.isLatestSetWaived = true;
                } else {
                    State.waiveConfig.isFirstSetWaived = true;
                }
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
