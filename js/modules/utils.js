/**
 * 日付フォーマットなどのユーティリティ関数
 */
export const Utils = {
    /**
     * 日付を文字列に変換 (YYYY/MM/DD(WW) hh:mm:ss)
     */
    dateToStr(date, format = 'YYYY/MM/DD(WW) hh:mm:ss') {
        if (!date) return "";
        const weekday = ["日", "月", "火", "水", "木", "金", "土"];
        
        let res = format;
        res = res.replace(/YYYY/g, date.getFullYear());
        res = res.replace(/MM/g, ('0' + (date.getMonth() + 1)).slice(-2));
        res = res.replace(/DD/g, ('0' + date.getDate()).slice(-2));
        res = res.replace(/WW/g, weekday[date.getDay()]);
        res = res.replace(/hh/g, ('0' + date.getHours()).slice(-2));
        res = res.replace(/mm/g, ('0' + date.getMinutes()).slice(-2));
        res = res.replace(/ss/g, ('0' + date.getSeconds()).slice(-2));
        return res;
    },

    /**
     * 数値チェック（空文字やNaNを確実に0にする）
     */
    checkZero(num) {
        if (num === null || num === undefined || num === "") {
            return 0;
        }
        const n = Number(num);
        return isNaN(n) ? 0 : n;
    }
};
