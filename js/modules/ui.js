/**
 * DOM操作（表示更新）を担当
 */
import { State } from './state.js';
import { Calculator } from './calculator.js';
import { Utils } from './utils.js';
import { CONSTANTS } from './constants.js';

export const UI = {
    /**
     * 画面全体の表示を更新
     */
    updateAll() {
        this.updateMoneyDisplay();
        this.updateSettingsDisplay();
        this.updateHistoryTable();
        this.updateFutureTable();
        this.updateSaveButton();
    },

    /**
     * 保存ボタンの状態を更新
     */
    updateSaveButton() {
        if (State.presets.editingId !== null) {
            $('#save-preset').text("お店情報を上書き保存").removeClass('btn-primary').addClass('btn-warning');
        } else {
            $('#save-preset').text("お店情報を保存する").removeClass('btn-warning').addClass('btn-primary');
        }
    },

    /**
     * 合計金額の表示を更新
     */
    updateMoneyDisplay() {
        const { total, tax } = Calculator.calculateTotalWithTax(State.totalMoney, State.settings.taxRate);
        $('#moneyText').text(total.toLocaleString() + "円");
        $('#taxText').text("内税" + tax.toLocaleString() + "円");
    },

    /**
     * 設定値（テキスト表示部分）を更新
     */
    updateSettingsDisplay() {
        // State.startDateが無効な場合は現在時刻をセット（表示崩れ防止）
        if (!State.startDate || isNaN(State.startDate.getTime())) {
            State.startDate = new Date();
        }

        const hours = ('0' + State.startDate.getHours()).slice(-2);
        const minutes = ('0' + State.startDate.getMinutes()).slice(-2);
        const timeStr = `${hours}:${minutes}`;
        $('#startTimeEdit').val(timeStr);
        $('#startTimeDisplay').text(timeStr);

        $('#shopNameText').text("店舗名：" + (State.settings.shopName || "名無しのお店"));
        $('#numPeopleText').text("来店人数：" + State.settings.numPeople + "人");

        if (State.settings.firstChargeTime > 0 && State.settings.firstChargeMoney > 0) {
            $('#firstChargeText').show().text(`初回セット料金：${State.settings.firstChargeTime}分 ${State.settings.firstChargeMoney}円`);
        } else {
            $('#firstChargeText').hide();
        }

        $('#chargeText').text(`通常セット料金：${State.settings.chargeTime}分 ${State.settings.chargeMoney}円`);
        $('#taxSettingText').text(`TAX：${State.settings.taxRate}%`);

        if (State.settings.initialCost > 0) {
            $('#initMoneyText').show().text(`初期費用：${State.settings.initialCost}円`);
        } else {
            $('#initMoneyText').hide();
        }
    },

    /**
     * 注文履歴テーブルの更新
     */
    updateHistoryTable() {
        $("#processesTable").empty();
        const counts = {};

        // 最後のセット料金（通常セットまたは初回セット）のインデックスを探す
        let lastSetFeeIndex = -1;
        for (let i = State.orderHistory.length - 1; i >= 0; i--) {
            const item = State.orderHistory[i];
            if (item.name === CONSTANTS.ITEM_NAMES.NORMAL_SET || item.name === CONSTANTS.ITEM_NAMES.FIRST_SET) {
                lastSetFeeIndex = i;
                break;
            }
        }

        State.orderHistory.forEach((item, index) => {
            const timeText = Utils.dateToStr(new Date(item.date), "hh:mm");
            let nameText = item.name;
            counts[item.name] = (counts[item.name] || 0) + 1;

            if (item.optionText === CONSTANTS.SUFFIX.MINUTES) {
                // セット料金の表示
                const setIndex = counts[item.name];
                let totalMinutes = (item.name === CONSTANTS.ITEM_NAMES.FIRST_SET) 
                    ? State.settings.firstChargeTime 
                    : State.settings.firstChargeTime + (State.settings.chargeTime * setIndex);
                const h = Math.floor(totalMinutes / 60);
                const m = totalMinutes % 60;
                nameText += ` 〜${h > 0 ? h + "時間" : ""}${m}分`;
            } else if (item.optionText === CONSTANTS.SUFFIX.COUNT) {
                // カスタム項目の表示: アイテムごとの単位を取得
                const customDef = State.prices.custom[item.name];
                const unit = (customDef && customDef.suffix) ? customDef.suffix : "";
                nameText += ` ${counts[item.name]}${unit}`;
            } else if (item.optionText) {
                // その他（杯目など）
                nameText += ` ${counts[item.name]}${item.optionText}`;
            }

            const isSetFee = (item.name === CONSTANTS.ITEM_NAMES.NORMAL_SET || item.name === CONSTANTS.ITEM_NAMES.FIRST_SET);
            const isLastSetFee = (index === lastSetFeeIndex);
            const canDelete = !isSetFee || isLastSetFee;

            // 行ごとに色を変える（確実に色が合うようインラインスタイルで指定）
            const isGray = (index % 2 === 0);
            const rowBgColor = isGray ? '#f2f2f2' : '#ffffff'; 

            const amountCell = $("<td class='vcenter' style='padding: 0; white-space: nowrap;'></td>");
            const amountWrapper = $(`<div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 4px 0.75rem 0.75rem; width: 100%;"></div>`);
            amountWrapper.append($(`<span style="flex-grow: 1; text-align: right;">${Number(item.amount).toLocaleString()}円</span>`));
            
            if (canDelete) {
                // 右端ギリギリまで寄せる
                amountWrapper.append(
                    $(`<span class="ml-1" style="cursor: pointer; width: 20px; height: 20px; min-width: 20px; border-radius: 50%; background-color: #dc3545; color: ${rowBgColor}; display: flex; align-items: center; justify-content: center; font-size: 10px; line-height: 1; flex-shrink: 0;" title="削除"><i class="fas fa-times"></i></span>`)
                        .click(() => window.App.deleteHistoryItem(index))
                );
            } else {
                // 削除ボタンがない場合も右端の余白を調整
                amountWrapper.append($('<div style="width: 20px; flex-shrink: 0;" class="ml-1"></div>'));
            }
            amountCell.append(amountWrapper);

            const row = $(`<tr style="background-color: ${rowBgColor};"></tr>`)
                .append($("<td class='vcenter'></td>").html(timeText))
                .append($("<td class='vcenter'></td>").html(nameText))
                .append(amountCell);

            $("#processesTable").prepend(row);
        });
    },

    /**
     * 未来予想テーブルの更新
     */
    updateFutureTable() {
        $(".added-row").remove();
        if (!State.isStarted) return;

        const firstSetCount = State.countItem(CONSTANTS.ITEM_NAMES.FIRST_SET);
        const normalSetCount = State.countItem(CONSTANTS.ITEM_NAMES.NORMAL_SET);
        let totalSetCount = firstSetCount + normalSetCount;
        const currentMoneyTotal = State.totalMoney;

        for (let i = 0; i < 15; i++) {
            totalSetCount++;
            const futureDate = new Date(State.lastChargeDate);
            futureDate.setTime(futureDate.getTime() + (State.settings.chargeTime * 60 * 1000 + 1000) * i);
            
            const timeText = Utils.dateToStr(futureDate, "hh:mm");
            const additionalMoneyPerSet = (State.settings.chargeMoney + State.settings.endlessJyonaiShimei) * State.settings.numPeople;
            const projectedMoney = currentMoneyTotal + (additionalMoneyPerSet * (i + 1));
            const { total } = Calculator.calculateTotalWithTax(projectedMoney, State.settings.taxRate);

            const totalMinutes = (State.settings.firstChargeTime * firstSetCount) + (State.settings.chargeTime * (normalSetCount + i + 1));
            const h = Math.floor(totalMinutes / 60);
            const m = totalMinutes % 60;

            $("#futurePprocessesTable").append(
                $("<tr class='added-row'></tr>")
                .append($("<td class='vcenter'></td>").html(timeText))
                .append($("<td class='vcenter'></td>").html(`${totalSetCount}セット：〜${h > 0 ? h + "h" : ""}${m}m`))
                .append($("<td class='vcenter'></td>").html(total.toLocaleString() + "円"))
            );
        }
    },

    /**
     * 設定フォームの値をUIにセット
     */
    syncFormFromState() {
        $('#shopNameSetting').val(State.settings.shopName);
        $('#numSetting').val(State.settings.numPeople);
        $('#firstTimeChargeTimeSetting').val(State.settings.firstChargeTime);
        $('#firstTimeChargeMoneySetting').val(State.settings.firstChargeMoney);
        $('#chargeTimeSetting').val(State.settings.chargeTime);
        $('#chageSetting').val(State.settings.chargeMoney);
        $('#taxSetting').val(State.settings.taxRate);
        $('#otherSetting').val(State.settings.initialCost);

        $('#pro-amount').val(State.prices.my);
        $('#hino-amount').val(State.prices.cast);
        $('#sp-amount').val(State.prices.shot);
        $('#other-amount').val(State.prices.other);
        $('#endless-jyonai-shimei-amount').val(State.prices.endlessShimei);
        
        const currentItemName = $('#customItemSelect').val();
        const customItem = State.prices.custom[currentItemName];
        if (customItem) {
            $('#customItemAmount').val(customItem.price);
        }
    },

    /**
     * トースト通知を表示する（Bootstrap/MDB風スタイル）
     */
    showToast(message, type = 'info') {
        const bgClass = type === 'danger' ? 'bg-danger' : (type === 'warning' ? 'bg-warning text-dark' : 'bg-primary');
        const toastId = 'toast-' + Date.now();
        const toastHtml = `
            <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0 mb-2" role="alert" aria-live="assertive" aria-atomic="true" style="display: block; min-width: 250px; opacity: 0; transition: opacity 0.3s ease-in-out; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                <div class="d-flex">
                    <div class="toast-body p-3" style="font-size: 0.95rem; font-weight: 500;">
                        ${message.replace(/\n/g, '<br>')}
                    </div>
                </div>
            </div>
        `;
        
        const $toast = $(toastHtml);
        $('#toast-container').append($toast);
        
        // フェードイン
        setTimeout(() => $toast.css('opacity', '1'), 10);
        
        // 4秒後に自動消去
        setTimeout(() => {
            $toast.css('opacity', '0');
            setTimeout(() => $toast.remove(), 300);
        }, 4000);
    },

    /**
     * カスタム確認ダイアログ（モーダル）を表示する
     * @returns {Promise<boolean>} 「はい」ならtrue
     */
    showConfirm(message, title = "確認") {
        return new Promise((resolve) => {
            $('#confirmTitle').text(title);
            $('#confirmMessage').html(message.replace(/\n/g, '<br>'));
            
            const $modal = $('#confirmModal');
            
            // 「はい」ボタン
            $('#confirmOkBtn').off('click').on('click', () => {
                $modal.modal('hide');
                resolve(true);
            });
            
            // モーダルが閉じたとき（キャンセル等）
            $modal.off('hidden.bs.modal').on('hidden.bs.modal', () => {
                resolve(false);
            });
            
            $modal.modal('show');
        });
    }
};
