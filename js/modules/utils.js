/**
 * 日付フォーマットなどのユーティリティ関数
 */
export const Utils = {
    /**
     * 日付を文字列に変換 (YYYY/MM/DD(WW) hh:mm:ss)
     */
    dateToStr(date, format = 'YYYY/MM/DD(WW) hh:mm:ss') {
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
     * 数値チェック
     */
    checkZero(num) {
        if (!num || num === "" || isNaN(num)) {
            return 0;
        }
        return Number(num);
    }
};
