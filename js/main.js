'use strict';

// 開始しているかのフラグ。
var isStarted = false;

// 入店時刻。
var startdate = new Date();

// タイマーのID。
var timerId = 0;

// 合計料金。
var money = 0;

//! チャージ間隔。
var chargeTimeSetting = 0;

// チャージ料金。
var chageSetting = 0;

// TAX割合。
var taxSetting = 0;

// 初期費用。
var otherSetting = 0;

// 人数。
var numSetting = 0;

// 店舗名。
var shopNameSetting = "";

// 初回特別チャージ料金。
var firstTimeChargeMoneySetting = 0;
// 初回特別チャージ時間。
var firstTimeChargeTimeSetting = 0;

// すべての注文情報を保持したJson。
var jsonText;

// 注文詳細管理配列。
var amountDetailArray = [];

// 飲んだ杯数管理用。
var drinkCounter = {}

// Webからのコピペ。日付フォーマット。
function dateToStr24HPad0DayOfWeek(date, format) {
    var weekday = ["日", "月", "火", "水", "木", "金", "土"];
    if (!format) {
        format = 'YYYY/MM/DD(WW) hh:mm:ss'
    }
    format = format.replace(/YYYY/g, date.getFullYear());
    format = format.replace(/MM/g, ('0' + (date.getMonth() + 1)).slice(-2));
    format = format.replace(/DD/g, ('0' + date.getDate()).slice(-2));
    format = format.replace(/WW/g, weekday[date.getDay()]);
    format = format.replace(/hh/g, ('0' + date.getHours()).slice(-2));
    format = format.replace(/mm/g, ('0' + date.getMinutes()).slice(-2));
    format = format.replace(/ss/g, ('0' + date.getSeconds()).slice(-2));
    return format;
}

function load() {
    var saveData = store.get('liccounter_user_data');
    // データが存在するならせっせとフォームにセットしにいく。
    if (!saveData) {
        return;
    }
    if (saveData["liccounter_chageSetting"] && saveData["liccounter_chageSetting"] != "") {
        $('#chageSetting').val(saveData["liccounter_chageSetting"]);
        chageSetting = saveData["liccounter_chageSetting"];
    }
    if (saveData["liccounter_taxSetting"] && saveData["liccounter_taxSetting"] != "") {
        $('#taxSetting').val(saveData["liccounter_taxSetting"]);
        taxSetting = saveData["liccounter_taxSetting"];
    }
    if (saveData["liccounter_chargeTimeSetting"] && saveData["liccounter_chargeTimeSetting"] != "") {
        $('#chargeTimeSetting').val(saveData["liccounter_chargeTimeSetting"]);
        chargeTimeSetting = saveData["liccounter_chargeTimeSetting"];
    }
    if (saveData["liccounter_otherSetting"] && saveData["liccounter_otherSetting"] != "") {
        $('#otherSetting').val(saveData["liccounter_otherSetting"]);
        otherSetting = saveData["liccounter_otherSetting"];
    }
    if (saveData["liccounter_numSetting"] && saveData["liccounter_numSetting"] != "") {
        $('#numSetting').val(saveData["liccounter_numSetting"]);
        numSetting = saveData["liccounter_numSetting"];
    }
    if (saveData["liccounter_shopNameSetting"] && saveData["liccounter_shopNameSetting"] != "") {
        $('#shopNameSetting').val(saveData["liccounter_shopNameSetting"]);
        numSetting = saveData["liccounter_shopNameSetting"];
    }

    if (saveData["liccounter_firstTimeChargeMoneySetting"] && saveData["liccounter_firstTimeChargeMoneySetting"] != "") {
        $('#firstTimeChargeMoneySetting').val(saveData["liccounter_firstTimeChargeMoneySetting"]);
        firstTimeChargeMoneySetting = saveData["liccounter_firstTimeChargeMoneySetting"];
    }
    if (saveData["liccounter_firstTimeChargeTimeSetting"] && saveData["liccounter_firstTimeChargeTimeSetting"] != "") {
        $('#firstTimeChargeTimeSetting').val(saveData["liccounter_firstTimeChargeTimeSetting"]);
        firstTimeChargeTimeSetting = saveData["liccounter_firstTimeChargeTimeSetting"];
    }

    // すでに開始している。
    if (saveData["liccounter_enable"] && saveData["liccounter_enable"] != "") {
        if (saveData["liccounter_enable"]) {
            isStarted = true;
            startWork(saveData["liccounter_time"]);

            // 注文情報をすべて読み込み。startWork後じゃないとだめ。
            if (saveData["liccounter_jsonText"] && saveData["liccounter_jsonText"] != "") {
                var json = JSON.parse(saveData["liccounter_jsonText"]);
                json.forEach(function(value) {
                    addDrink(value.name, value.amount, new Date(value.date), value.optionText);
                });
            }

            // addDrinkしてからじゃないとだめ。
            checkCharge();

            // もろもろ描画更新。
            $('#start').hide();
            $('#stop').show();
            $('#menu_button_0').hide();
            $('#menu_button_1').show();
            $('#menu_button_2').show();
            $('#menu_button_3').show();
            $('#menu_button_4').show();
            $('#menu_button_5').show();
            $('#menu_button_6').show();
            $('#menu_button_7').show();
        }
    }
}

function save(_time, _enable, _jikyuu, jsonText) {
    var saveData = {};

    saveData["liccounter_time"] = _time.getTime();
    saveData["liccounter_enable"] = _enable;
    saveData["liccounter_chageSetting"] = _jikyuu;
    saveData["liccounter_taxSetting"] = taxSetting;

    saveData["liccounter_chargeTimeSetting"] = chargeTimeSetting;
    saveData["liccounter_otherSetting"] = otherSetting;

    saveData["liccounter_numSetting"] = numSetting;
    saveData["liccounter_shopNameSetting"] = shopNameSetting;

    saveData["liccounter_firstTimeChargeMoneySetting"] = firstTimeChargeMoneySetting;
    saveData["liccounter_firstTimeChargeTimeSetting"] = firstTimeChargeTimeSetting;

    saveData["liccounter_jsonText"] = jsonText;

    store.set('liccounter_user_data', saveData);
}

function initialize() {

    // 前回のデータ読み込み。
    load();
}

// チャージの抜け漏れチェック。
function checkCharge() {

    var diff_time = Date.now() - startdate.getTime();
    var seconds = Math.floor(diff_time / 1000) + 1;

    // チャージの必要な回数。
    var chargeCount = Math.ceil(seconds / (60 * chargeTimeSetting));
    // 足りてない分足す。この間にドリンクの注文はないはずなのでスルー。
    var drinkCount = drinkCounter["チャージ料👯‍♀️："] ? drinkCounter["チャージ料👯‍♀️："] : 0;
    var loop = chargeCount - drinkCount;
    for (var i = 0; i < loop; ++i) {
        var cargeData = new Date(startdate.getTime());
        cargeData.setMinutes(cargeData.getMinutes() + chargeTimeSetting * (drinkCount + i));
        addDrink("チャージ料👯‍♀️：", chageSetting, cargeData, "分");
    }
}

function startWork(startTime) {
    const countUp = (IsAddDrink) => {
        // 経過時間。
        $('#timeText').text("滞在時間：" + passTime(startdate));

        // チャージ料を計算。
        if (IsAddDrink) {
            checkCharge();
        }
    }

    // フォームに入力された値を取得。
    chageSetting = $('#chageSetting').val();
    taxSetting = $('#taxSetting').val();
    chargeTimeSetting = $('#chargeTimeSetting').val();
    otherSetting = $('#otherSetting').val();
    numSetting = $('#numSetting').val();
    shopNameSetting = $('#shopNameSetting').val();

    firstTimeChargeMoneySetting = $('#firstTimeChargeMoneySetting').val();
    firstTimeChargeTimeSetting = $('#firstTimeChargeTimeSetting').val();


    if (isNaN(chageSetting)) {
        alert("入力されたチャージ料が数値ではありません");
        return false;
    } else if (chageSetting == "") {
        alert("チャージ料を入力してください");
        return false;
    }

    if (startTime == 0) {
        startdate = new Date();
    } else {
        startdate = new Date(startTime);
    }

    // 初期費用がある場合には初期費用を加算。
    if (!isStarted && otherSetting > 0) {
        addDrink("初期費用💰", otherSetting, startdate, "");
    }

    // もろもろ値初期化。
    countUp(!isStarted);

    // 開始日時。
    var day = dateToStr24HPad0DayOfWeek(startdate, '入店時刻：YYYY年MM月DD日(WW) hh:mm');
    $('#startTimeText').text(day);

    $('#shopNameText').text("店舗名：" + shopNameSetting);
    $('#numPeopleText').text("来店人数：" + numSetting + "人");
    $('#chargeText').text("チャージ料金：" + chargeTimeSetting + "分 " +  chageSetting + "円");

    timerId = setInterval(countUp, 1000, true);
    isStarted = true;

    return true;
}

function stopWork() {
    clearInterval(timerId);
    isStarted = false;

    var taxMoney = (money * (taxSetting / 100));
    var totalMoney = money + taxMoney;

    alert("お会計は" + parseInt(totalMoney).toLocaleString() + "円でした。\n今日も楽しめましたか？");

    return true;
}

// 経過時間のテキストを返す。
function passTime(startTime) {
    var diff_time = Date.now() - startTime.getTime();
    var seconds = Math.floor(diff_time / 1000);
    var pass_seconds = seconds % 60;
    var pass_minutes = Math.floor(seconds / 60) % 60;
    var pass_hours = Math.floor(seconds / (60 * 60));

    return ('0' + pass_hours).slice(-2) + ":" + ('0' + pass_minutes).slice(-2) + ":" + ('0' + pass_seconds).slice(-2);
}

function addDrink(name, amount, date, optionText) {

    addMoney(amount);

    if (!drinkCounter[name]) {
        drinkCounter[name] = 0;
    }
    drinkCounter[name] += 1;

    var nowDatText = dateToStr24HPad0DayOfWeek(date, "hh:mm");

    if (optionText != "") {
        // チャージ用の超特殊処理ｗ
        if (optionText == "分") {
            var min = chargeTimeSetting * drinkCounter[name];
            var hour = Math.floor(min / 60);

            var text = "";
            text += hour > 0 ? hour + "時間" : "";
            text += min % 60;

            $("#processesTable").prepend(
                $("<tr></tr>")
                .append($("<td class='vcenter'></td>").html(nowDatText))
                .append($("<td class='vcenter'></td>").html(name + " " + text + optionText))
                .append($("<td class='vcenter'></td>").html(parseInt(amount).toLocaleString() + "円"))
            );
        } else {
            $("#processesTable").prepend(
                $("<tr></tr>")
                .append($("<td class='vcenter'></td>").html(nowDatText))
                .append($("<td class='vcenter'></td>").html(name + " " + drinkCounter[name] + optionText))
                .append($("<td class='vcenter'></td>").html(parseInt(amount).toLocaleString() + "円"))
            );
        }
    } else {
        $("#processesTable").prepend(
            $("<tr></tr>")
            .append($("<td class='vcenter'></td>").html(nowDatText))
            .append($("<td class='vcenter'></td>").html(name))
            .append($("<td class='vcenter'></td>").html(parseInt(amount).toLocaleString() + "円"))
        );
    }

    // お会計情報に追加して保存。
    var amountDetail = {};
    amountDetail.name = name;
    amountDetail.date = date;
    amountDetail.amount = amount;
    amountDetail.optionText = optionText;
    amountDetailArray.push(amountDetail);
    jsonText = JSON.stringify(amountDetailArray);
    save(startdate, true, chageSetting, jsonText);
    // console.log(jsonText);
}

function addMoney(addMoney) {

    money += parseInt(addMoney);
    var taxMoney = (money * (taxSetting / 100));
    var totalMoney = money + taxMoney;
    $('#moneyText').text(totalMoney.toLocaleString() + "円");
    $('#taxText').text("内税" + taxMoney.toLocaleString() + "円");
}

function downloadText(fileName, text) {

    var bom = new Uint8Array([0xEF, 0xBB, 0xBF]);

    const blob = new Blob([bom, text], { type: 'text/plain' });
    const aTag = document.createElement('a');
    aTag.href = URL.createObjectURL(blob);
    aTag.target = '_blank';
    aTag.download = fileName;
    aTag.click();
    URL.revokeObjectURL(aTag.href);
}

function makeResultText() {
    var text = "";

    text += "◆ 店舗名\n";
    text += shopNameSetting + "\n\n";
    text += "◆ 来店日時\n";
    text += dateToStr24HPad0DayOfWeek(startdate, 'YYYY年MM月DD日(WW) hh:mm') + "\n\n";
    text += "◆ 来店人数\n";
    text += numSetting + "人\n\n";
    text += "◆ チャージ料金\n";
    text += chargeTimeSetting + "分 " +  chageSetting + "円\n\n";

    text += "◆ 滞在時間\n";
    text += passTime(startdate) + "\n\n";
    text += "◆ 支払い金額\n";
    var taxMoney = (money * (taxSetting / 100));
    var totalMoney = money + taxMoney;
    text += parseInt(totalMoney).toLocaleString() + "円" + "(内税" + taxMoney + "円)\n\n";

    text += "◆ 合計杯数\n";
    for (let key in drinkCounter) {
        if (key != "チャージ料👯‍♀️：" && key != "初期費用💰") {
            text += key + ' ' + drinkCounter[key] + "杯\n";
        }
    }
    text += "\n";

    text += "=======================" + "\n\n"
    text += "◆ 支払い詳細\n";

    // ドリンク詳細。
    var json = JSON.parse(jsonText);
    json.forEach(function(value) {
        var date = new Date(value.date);
        text += dateToStr24HPad0DayOfWeek(date, 'hh:mm') + " " + value.name + " " + parseInt(value.amount).toLocaleString() + "円" + "\n";
    });

    text += "\n=======================" + "\n"
    text += "\n\n";

    return text;
}

function checkError(amount) {
    if (isNaN(amount)) {
        alert("入力された料金が数値ではありません");
        return false;
    } else if (amount == "") {
        alert("料金を入力してください");
        return false;
    }
    return true;
}

$(function() {
    // 開始ボタン。
    $('#start').click(function() {
        // 開始してたらスルー。
        if (isStarted) {
            return;
        }
        if (!startWork(0)) {
            return;
        }
        save(startdate, true, chageSetting, jsonText);
        $('#start').hide();
        $('#stop').show();
        $('#menu_button_0').hide();
        $('#menu_button_1').show();
        $('#menu_button_2').show();
        $('#menu_button_3').show();
        $('#menu_button_4').show();
        $('#menu_button_5').show();
        $('#menu_button_6').show();
        $('#menu_button_7').show();
    });
    // 終了ボタン。
    $('#stop').click(function() {
        // 開始してなかったらスルー。
        if (!isStarted) {
            return;
        }

        var result = confirm("お会計しますか？")
        if (!result) {
            return;
        }
        if (!stopWork()) {
            return;
        }
        save(startdate, false, chageSetting);
        // $('#start').show();
        $('#stop').hide();
        // $('#menu_button_0').show();
        $('#menu_button_1').hide();
        $('#menu_button_2').hide();
        $('#resultDownload').show();
    });

    $('#resultDownload').click(function() {
        var day = dateToStr24HPad0DayOfWeek(startdate, 'YYYY年MM月DD日(WW) hh時mm分');
        var resultText = makeResultText();
        downloadText(day + "_飲みの記録.txt", resultText);
        // downloadText(day + "_飲みの記録.json", jsonText);
    });

    $('#pro-drink').click(function() {
        var amount = $('#pro-amount').val();
        if (!checkError(amount)) {
            return;
        }
        addDrink("ぷろドリンク🍺：", amount, new Date(), "杯目");
    });
    $('#hino-drink').click(function() {
        var amount = $('#hino-amount').val();
        if (!checkError(amount)) {
            return;
        }
        addDrink("キャスドリ🍹：", amount, new Date(), "杯目");
    });
    $('#sp-drink').click(function() {
        var amount = $('#sp-amount').val();
        if (!checkError(amount)) {
            return;
        }
        addDrink("ショット🥃：", amount, new Date(), "杯目");
    });
    $('#other-drink').click(function() {
        var amount = $('#other-amount').val();
        if (!checkError(amount)) {
            return;
        }
        addDrink("他ドリンク🥂：", amount, new Date(), "杯目");
    });

    $('#cacheclear').click(function() {
        alert("保存してあるデータを削除します");
        store.clearAll();
        location.reload();
    });
});