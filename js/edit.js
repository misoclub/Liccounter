/**
 * お店情報編集画面のロジック
 */
import { State } from './modules/state.js';
import { Storage } from './modules/storage.js';
import { Utils } from './modules/utils.js';
import { CONSTANTS } from './modules/constants.js';

const EditApp = {
    presetId: null,

    init() {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        if (!id) {
            alert("IDが正しく指定されていません。");
            window.location.href = './';
            return;
        }
        this.presetId = parseInt(id, 10);
        this.loadData();
        this.setupEventListeners();
    },

    loadData() {
        Storage.load(this.presetId);
        $('#shopName').val(State.settings.shopName);
        $('#chargeTime').val(State.settings.chargeTime);
        $('#chargeMoney').val(State.settings.chargeMoney);
        $('#firstChargeTime').val(State.settings.firstChargeTime);
        $('#firstChargeMoney').val(State.settings.firstChargeMoney);
        $('#taxRate').val(State.settings.taxRate);
        $('#initialCost').val(State.settings.initialCost);
        $('#price_my').val(State.prices.my);
        $('#price_cast').val(State.prices.cast);
        $('#price_shot').val(State.prices.shot);
        $('#price_other').val(State.prices.other);
        $('#price_endless').val(State.prices.endlessShimei);
        this.renderCustomItems();
    },

    renderCustomItems() {
        const area = $('#custom-prices-area');
        area.empty();
        Object.keys(State.prices.custom).forEach(name => {
            const item = State.prices.custom[name];
            const isVisible = item.visible !== false;
            const suffix = item.suffix !== undefined ? item.suffix : "";

            const html = `
                <div class="form-group row align-items-center mb-2 no-gutters custom-price-row">
                    <div class="col-1 text-center">
                        <input type="checkbox" class="item-visible-check" data-name="${name}" ${isVisible ? 'checked' : ''}>
                    </div>
                    <div class="col-4 pr-1">
                        <label class="small text-truncate w-100">${name.replace('：', '')}</label>
                    </div>
                    <div class="col-4 pr-1">
                        <input type="number" class="form-control custom-price-input" 
                               data-name="${name}" value="${item.price}">
                    </div>
                    <div class="col-2 pr-1">
                        <input type="text" class="form-control custom-suffix-input text-center" 
                               data-name="${name}" value="${suffix}" placeholder="単位">
                    </div>
                    <div class="col-1 text-right">
                        ${!CONSTANTS.DEFAULTS.CUSTOM_PRICES[name] ? `<button type="button" class="btn btn-link btn-sm text-danger remove-item-btn p-0" data-name="${name}"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                </div>
            `;
            area.append(html);
        });
    },

    setupEventListeners() {
        $('#edit-form').submit((e) => { e.preventDefault(); this.saveData(); });

        // --- 削除ボタンの処理を修正 ---
        $('#delete-btn').off('click').click(() => {
            if (confirm("このお店情報を完全に削除しますか？\n(削除後は復元できません)")) {
                // 1. お店の一覧データ(preset_ser_dataX)を取得
                const presetKey = CONSTANTS.STORAGE_KEYS.PRESET_DATA_PREFIX + this.presetId;
                const presetInfo = Storage.get(presetKey);
                
                if (presetInfo) {
                    // 2. 有効フラグをオフにして保存
                    presetInfo.enable = false;
                    Storage.set(presetKey, presetInfo);
                    
                    // 3. 詳細データ(liccounter_user_dataX)も削除（任意ですがクリーンアップのため）
                    // localStorage.removeItem('liccounter_user_data' + this.presetId); 
                }
                
                alert("削除しました。");
                window.location.href = './';
            }
        });

        $('#add-new-item-btn').click(() => {
            const nameInput = $('#new-item-name');
            const priceInput = $('#new-item-price');
            const suffixInput = $('#new-item-suffix');
            let name = nameInput.val().trim();
            const price = Utils.checkZero(priceInput.val());
            const suffix = suffixInput.val().trim();
            if (!name) return;
            if (!name.endsWith('：')) name += '：';
            if (State.prices.custom[name]) { alert("その項目名は既に存在します。"); return; }
            State.prices.custom[name] = { price: price, suffix: suffix, visible: true };
            nameInput.val(''); priceInput.val(''); suffixInput.val('');
            this.renderCustomItems();
        });

        $('#custom-prices-area').on('click', '.remove-item-btn', (e) => {
            const name = $(e.currentTarget).data('name');
            if (confirm(`「${name}」を削除しますか？`)) { delete State.prices.custom[name]; this.renderCustomItems(); }
        });
    },

    saveData() {
        State.settings.shopName = $('#shopName').val();
        State.settings.chargeTime = Utils.checkZero($('#chargeTime').val());
        State.settings.chargeMoney = Utils.checkZero($('#chargeMoney').val());
        State.settings.firstChargeTime = Utils.checkZero($('#firstChargeTime').val());
        State.settings.firstChargeMoney = Utils.checkZero($('#firstChargeMoney').val());
        State.settings.taxRate = Utils.checkZero($('#taxRate').val());
        State.settings.initialCost = Utils.checkZero($('#initialCost').val());
        State.prices.my = Utils.checkZero($('#price_my').val());
        State.prices.cast = Utils.checkZero($('#price_cast').val());
        State.prices.shot = Utils.checkZero($('#price_shot').val());
        State.prices.other = Utils.checkZero($('#price_other').val());
        State.prices.endlessShimei = Utils.checkZero($('#price_endless').val());

        const newCustom = {};
        $('.custom-price-input').each(function() {
            const name = $(this).data('name');
            const price = Utils.checkZero($(this).val());
            const visible = $(`.item-visible-check[data-name="${name}"]`).is(':checked');
            const suffix = $(`.custom-suffix-input[data-name="${name}"]`).val();
            newCustom[name] = { price, visible, suffix };
        });
        State.prices.custom = newCustom;

        Storage.save(this.presetId, false, false); // isNew = false

        // --- 追加: 現在選択中のお店なら、メインセッション(0)も更新する ---
        const currentSession = Storage.load(0);
        if (currentSession && currentSession["origin_preset_id"] == this.presetId) {
            // 現在のセッション(0)の注文履歴と開始時間は維持しつつ、設定だけ最新にする
            // Storage.load(0)でStateに履歴が入っているので、そのままsave(0)すれば設定だけが上書きされる
            Storage.save(0, !!currentSession["liccounter_enable"], false);
        }

        alert("設定を保存しました。");
        window.location.href = './';
    }
};

$(() => { EditApp.init(); });
