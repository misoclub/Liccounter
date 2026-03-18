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
        const hours = ('0' + State.startDate.getHours()).slice(-2);
        const minutes = ('0' + State.startDate.getMinutes()).slice(-2);
        $('#startTimeEdit').val(`${hours}:${minutes}`);

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

            const row = $("<tr></tr>")
                .append($("<td class='vcenter'></td>").html(timeText))
                .append($("<td class='vcenter'></td>").html(nameText))
                .append($("<td class='vcenter'></td>").html(Number(item.amount).toLocaleString() + "円"));

            const deleteCell = $("<td class='vcenter text-right' style='padding: 0.5rem;'></td>");
            if (canDelete) {
                deleteCell.append(
                    $('<button type="button" class="btn btn-sm btn-outline-danger" style="padding: 2px 6px; line-height: 1; display: inline-flex; align-items: center; justify-content: center; height: 24px; width: 24px; margin: 0;"><i class="fas fa-times" style="font-size: 12px;"></i></button>')
                        .click(() => window.App.deleteHistoryItem(index))
                );
            }
            row.append(deleteCell);

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
    }
};
