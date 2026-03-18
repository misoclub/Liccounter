/**
 * 料金計算や時間の計算
 */
import { Utils } from './utils.js';

export const Calculator = {
    /**
     * 経過時間のテキストを返す
     */
    getPassTimeText(startTime) {
        const diffTime = Date.now() - startTime.getTime();
        const seconds = Math.floor(diffTime / 1000);
        return this.formatTime(seconds);
    },

    /**
     * 残り時間のテキストを返す
     */
    getLastTimeText(targetTime) {
        const diffTime = targetTime.getTime() - Date.now();
        const seconds = Math.floor(diffTime / 1000);
        return this.formatTime(seconds);
    },

    /**
     * 秒数を hh:mm:ss 形式に整形
     */
    formatTime(seconds) {
        if (seconds < 0) return "00:00:00";
        const passSeconds = seconds % 60;
        const passMinutes = Math.floor(seconds / 60) % 60;
        const passHours = Math.floor(seconds / (60 * 60));
        return (
            ('0' + passHours).slice(-2) + ":" + 
            ('0' + passMinutes).slice(-2) + ":" + 
            ('0' + passSeconds).slice(-2)
        );
    },

    /**
     * 合計金額（税込）を計算
     */
    calculateTotalWithTax(money, taxRate) {
        const taxMoney = Math.floor(money * (taxRate / 100));
        return {
            total: money + taxMoney,
            tax: taxMoney
        };
    }
};
