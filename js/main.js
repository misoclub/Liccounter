'use strict';

// 開始しているかのフラグ。
var isStarted = false;

// 入店時刻。
var startdate = new Date();

// タイマーのID。
var timerId = 0;

// 合計料金。
var money = 0;

//! セット間隔。
var chargeTimeSetting = 0;

// セット料金。
var chageSetting = 0;

// 永続場内指名料金。
var endlessJyonaiShimei = 0;

// TAX割合。
var taxSetting = 0;

// 初期費用。
var otherSetting = 0;

// 人数。
var numSetting = 0;

// 店舗名。
var shopNameSetting = "";

// 初回特別セット料金。
var firstTimeChargeMoneySetting = 0;
// 初回特別セット時間。
var firstTimeChargeTimeSetting = 0;

// すべての注文情報を保持したJson。
var jsonText;

// 注文詳細管理配列。
var amountDetailArray = [];

// 飲んだ杯数管理用。
var drinkCounter = {}

var lastChargeDate = new Date();

// 値段設定たち。保存するときにくらいしか使わない。
var prices = []


var presetId = 0;
var presetCount = 0;
var presetDataGlobal = []

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

function load(presetId) {

// console.log("load presetId:" + presetId );

    // プリセット総数。
    var preset = store.get('preset_ser_data_count');
    if(preset)
    {
        presetCount = preset["presetCount"];
        presetDataGlobal = []
        // NOTE: IDは1番から始まるので注意。0番はプリセットではないデフォルトな数字。
        for(var i = 1; i <= presetCount; ++i)
        {
            var presetData = store.get('preset_ser_data' + i);
            if(presetData)
            {
                presetDataGlobal.push(presetData);
            }
        }
    }

    var saveData = store.get('liccounter_user_data' + presetId);

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


    if (saveData["price_my"] && saveData["price_my"] != "") {
        $('#pro-amount').val(saveData["price_my"]);
        prices["price_my"] = saveData["price_my"];
    }
    if (saveData["price_cast"] && saveData["price_cast"] != "") {
        $('#hino-amount').val(saveData["price_cast"]);
        prices["price_cast"] = saveData["price_cast"];
    }
    if (saveData["price_shot"] && saveData["price_shot"] != "") {
        $('#sp-amount').val(saveData["price_shot"]);
        prices["price_shot"] = saveData["price_shot"];
    }
    if (saveData["price_other"] && saveData["price_other"] != "") {
        $('#other-amount').val(saveData["price_other"]);
        prices["price_other"] = saveData["price_other"];
    }
    if (saveData["price_shimei"] && saveData["price_shimei"] != "") {
        $('#jyonai-shimei-amount').val(saveData["price_shimei"]);
        prices["price_shimei"] = saveData["price_shimei"];
    }
    if (saveData["price_endless_shimei"] && saveData["price_endless_shimei"] != "") {
        $('#endless-jyonai-shimei-amount').val(saveData["price_endless_shimei"]);
        prices["price_endless_shimei"] = saveData["price_endless_shimei"];
    }


    // すでに開始している。
    if (saveData["liccounter_enable"] && saveData["liccounter_enable"] != "") {
        if (saveData["liccounter_enable"]) {
            isStarted = true;

            // 次のセットまでの時間を先行して計算する。
            if (saveData["liccounter_jsonText"] && saveData["liccounter_jsonText"] != "") {
                var json = JSON.parse(saveData["liccounter_jsonText"]);
                json.forEach(function(value) {
                    // セット料金を見つけたらその次のセット時間までの時間の計算をしておく。
                    if(value.name == "初回セット料👯‍♀️：")
                    {
                        // セットが行われた時間。
                        var cargeData = new Date(value.date);
                        cargeData.setTime(cargeData.getTime() + Number(firstTimeChargeTimeSetting) * 60 * 1000 + 1 * 1000);
                        lastChargeDate = cargeData;
                    }
                    else if(value.name == "セット料👯‍♀️：")
                    {
                        // セットが行われた時間。
                        var cargeData = new Date(value.date);
                        cargeData.setTime(cargeData.getTime() + Number(chargeTimeSetting) * 60 * 1000 + 1 * 1000);
                        lastChargeDate = cargeData;
                    }
                    // すでに永続場内指名が発動している場合はボタンを無効化しておく。
                    else if(value.name == "永続場内指名✌️：")
                    {
                        $('#endless-jyonai-shimei').prop('disabled', true);
                        endlessJyonaiShimei = value.amount;
                    }
                });
            }

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
            $('#menu_button_8').show();

            $('#preset-save-div').show();
            $('#preset-load-div').hide();
        }
    }
}

function checkZero(num)
{
    if(!num || num === "")
    {
        return 0;
    }

    return num;
}

function save(_time, _enable, _jikyuu, jsonText, preset) {
    var saveData = {};

    saveData["liccounter_time"] = _time.getTime();
    saveData["liccounter_enable"] = _enable;
    saveData["liccounter_chageSetting"] = checkZero(_jikyuu);
    saveData["liccounter_taxSetting"] = checkZero(taxSetting);

    saveData["liccounter_chargeTimeSetting"] = checkZero(chargeTimeSetting);
    saveData["liccounter_otherSetting"] = checkZero(otherSetting);

    saveData["liccounter_numSetting"] = checkZero(numSetting);
    saveData["liccounter_shopNameSetting"] = shopNameSetting;

    saveData["liccounter_firstTimeChargeMoneySetting"] = checkZero(firstTimeChargeMoneySetting);
    saveData["liccounter_firstTimeChargeTimeSetting"] = checkZero(firstTimeChargeTimeSetting);

    saveData["liccounter_jsonText"] = jsonText;


    // ドリンクとかの値段達。
    saveData["price_my"] = checkZero(prices["price_my"]);
    saveData["price_cast"] = checkZero(prices["price_cast"]);
    saveData["price_shot"] = checkZero(prices["price_shot"]);
    saveData["price_other"] = checkZero(prices["price_other"]);
    saveData["price_shimei"] = checkZero(prices["price_shimei"]);
    saveData["price_endless_shimei"] = checkZero(prices["price_endless_shimei"]);


    store.set('liccounter_user_data' + preset, saveData);

    // console.log(saveData);

    // 0番はデフォで使用するのでプリセット登録は行わない。
    if(preset == 0)
    {
        // console.log("ぷりせっと登録しないよ");
        return;
    }

    // プリセット関係の保存を行う。
    var presetCountData = {}
    presetCountData["presetCount"] = presetCount;
    store.set('preset_ser_data_count', presetCountData);

    var presetData = {};
    presetData["presetName"] = shopNameSetting;
    presetData["presetId"] = preset;
    presetData["enable"] = true;
    store.set('preset_ser_data' + preset, presetData);
}

function deletePreset(presetId)
{
    var presetData = {};
    presetData["presetName"] = shopNameSetting;
    presetData["presetId"] = presetId;
    presetData["enable"] = false;
    store.set('preset_ser_data' + presetId, presetData);
}

function initialize() {

    // 前回のデータ読み込み。
    load(0);

    // プリセットボタンを配置する。
    for (var i = 0; i < presetCount; ++i)
    {
        // 無効化されている場合はボタン追加しない。
        if(!presetDataGlobal[i]["enable"])
        {
            continue;
        }

        var name = presetDataGlobal[i]["presetName"];
        var id = presetDataGlobal[i]["presetId"];

        // ボタン要素を作成
        var button = $('<div class="col"><button type="button" class="btn btn-secondary btn-lg btn-block" id="load-preset-' + id + '">' + name +'</button></div><div class="my-box mt-1"></div>');

        // ボタン要素にイベントリスナーを追加
        button.find('button').click(function() {
        var id = $(this).attr('id').replace('load-preset-', '');

            // 削除モードかどうか。
            if ($('#myCheckbox').is(':checked'))
            {
                // console.log('プリセットID:', presetId, 'を無効化します');
                deletePreset(id);

                // ボタンを無効化
                $(this).prop('disabled', true); 
            }
            else
            {
                // console.log('プリセットID:', id, 'のボタンがクリックされました');
                load(id);
            }
        });

        // ボタン要素をHTMLに追加
        $('#presetButtonTarget').after(button);

    }
}

// セットの抜け漏れチェック。
function checkCharge() {

    var diff_time = Date.now() - startdate.getTime();
    var seconds = Math.floor(diff_time / 1000) + 1;

    // 初回用の特殊計算を行う。
    if(firstTimeChargeTimeSetting > 0 && firstTimeChargeMoneySetting > 0)
    {
        // 初回分を引いた経過時間。
        seconds -= firstTimeChargeTimeSetting * 60;

        // 初回処理済の場合はもうやんない。
        if(!drinkCounter["初回セット料👯‍♀️："])
        {
            var cargeData = new Date(startdate.getTime());
            cargeData.setMinutes(cargeData.getMinutes());
            addDrink("初回セット料👯‍♀️：", firstTimeChargeMoneySetting * numSetting, cargeData, "分");

            // セット終了までの時間を保存。
            cargeData.setTime(cargeData.getTime() + (Number(firstTimeChargeTimeSetting) * 60 * 1000 + 1 * 1000));
            lastChargeDate = cargeData;
        }
    }

    // セットの必要な回数。
    var chargeCount = Math.ceil(seconds / (60 * chargeTimeSetting));
    // 足りてない分足す。この間にドリンクの注文はないはずなのでスルー。
    var drinkCount = drinkCounter["セット料👯‍♀️："] ? drinkCounter["セット料👯‍♀️："] : 0;
    var loop = chargeCount - drinkCount;
    for (var i = 0; i < loop; ++i) {
        var cargeData = new Date(startdate.getTime());
        cargeData.setMinutes(cargeData.getMinutes() + Number(chargeTimeSetting) * Number(drinkCount + i) + Number(firstTimeChargeTimeSetting));
        addDrink("セット料👯‍♀️：", chageSetting * numSetting, cargeData, "分");

        // セット終了までの時間を保存。
        cargeData.setTime(cargeData.getTime() + (Number(chargeTimeSetting) * 60 * 1000 + 1 * 1000));
        lastChargeDate = cargeData;

        // 場内指名を行ってい場合はその分も加算される。
        if(endlessJyonaiShimei > 0)
        {
            addDrink("永続場内指名✌️：", endlessJyonaiShimei, cargeData, "指名");
        }
    }
}

function startWork(startTime) {
    const countUp = (IsAddDrink) => {
        // 経過時間。
        $('#timeText').text("滞在時間：" + passTime(startdate));

        // セット料を計算。
        if (IsAddDrink) {
            checkCharge();
        }

        // 次のセットまでの時間
        $('#lastChaegeText').text("残り時間：" + lastTime(lastChargeDate));
    }

    // フォームに入力された値を取得。
    chageSetting = checkZero($('#chageSetting').val());
    taxSetting = checkZero($('#taxSetting').val());
    chargeTimeSetting = checkZero($('#chargeTimeSetting').val());
    otherSetting = checkZero($('#otherSetting').val());
    numSetting = checkZero($('#numSetting').val());
    shopNameSetting = $('#shopNameSetting').val();
    if(shopNameSetting == "")
    {
        shopNameSetting = "名無しのお店";
    }

    firstTimeChargeMoneySetting = checkZero($('#firstTimeChargeMoneySetting').val());
    firstTimeChargeTimeSetting = checkZero($('#firstTimeChargeTimeSetting').val());

    // 値段取得。
    prices["price_my"] = $('#pro-amount').val();
    prices["price_cast"] = $('#hino-amount').val();
    prices["price_shot"] = $('#sp-amount').val();
    prices["price_other"] = $('#other-amount').val();
    prices["price_shimei"] = $('#jyonai-shimei-amount').val();
    prices["price_endless_shimei"] = $('#endless-jyonai-shimei-amount').val();


    if (isNaN(chageSetting)) {
        alert("入力されたセット料が数値ではありません");
        return false;
    } else if (chargeTimeSetting == "" || chargeTimeSetting == 0) {
        alert("セット時間は0にできません");
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

    if(firstTimeChargeTimeSetting > 0 && firstTimeChargeMoneySetting > 0)
    {
        $('#firstChargeText').text("初回セット料金：" + firstTimeChargeTimeSetting + "分 " +  firstTimeChargeMoneySetting + "円");
    }
    else
    {
        $('#firstChargeText').hide();
    }

    $('#chargeText').text("通常セット料金：" + chargeTimeSetting + "分 " +  chageSetting + "円");

    $('#taxSettingText').text("TAX：" + taxSetting + "%");

    if(otherSetting > 0)
    {
        $('#initMoneyText').text("初期費用：" + otherSetting + "円");
    }
    else
    {
        $('#initMoneyText').hide();
    }


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

function lastTime(targetTime) {
    var diff_time = targetTime.getTime() - Date.now();
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
        // セット用の超特殊処理ｗ
        if (optionText == "分") {
            if(name == "初回セット料👯‍♀️：")
            {
                var min = Number(firstTimeChargeTimeSetting);
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
            }
            else
            {
                var min = Number(firstTimeChargeTimeSetting) + Number(chargeTimeSetting) * Number(drinkCounter[name]);
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
            }
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
    amountDetail.date = new Date(date);
    amountDetail.amount = amount;
    amountDetail.optionText = optionText;
    amountDetailArray.push(amountDetail);
    jsonText = JSON.stringify(amountDetailArray);
    save(startdate, true, chageSetting, jsonText, 0);
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

    text += "◆ 来店日時\n";
    text += dateToStr24HPad0DayOfWeek(startdate, 'YYYY年MM月DD日(WW) hh:mm') + "\n\n";
    text += "◆ 店舗名\n";
    text += shopNameSetting + "\n\n";
    text += "◆ 来店人数\n";
    text += numSetting + "人\n\n";
    if(firstTimeChargeTimeSetting > 0 && firstTimeChargeMoneySetting > 0)
    {
        text += "◆ 初回セット料金\n";
        text += firstTimeChargeTimeSetting + "分 " +  firstTimeChargeMoneySetting + "円\n\n";
    }
    text += "◆ 通常セット料金\n";
    text += chargeTimeSetting + "分 " +  chageSetting + "円\n\n";

    text += "◆ TAX\n";
    text += taxSetting + "%\n\n";

    if(otherSetting > 0)
    {
        text += "◆ 初期費用\n";
        text += otherSetting + "円\n\n";
    }

    text += "◆ 滞在時間\n";
    text += passTime(startdate) + "\n\n";
    text += "◆ 支払い金額\n";
    var taxMoney = (money * (taxSetting / 100));
    var totalMoney = money + taxMoney;
    text += parseInt(totalMoney).toLocaleString() + "円" + "(内税" + taxMoney + "円)\n\n";

    text += "◆ 合計杯数\n";
    for (let key in drinkCounter) {
        if (key == "ぷろドリンク🍺：" || key == "キャスドリ🍹：" || key == "ショット🥃：" || key == "他ドリンク🥂：") {
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
        save(startdate, true, chageSetting, jsonText, 0);
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
        $('#menu_button_8').show();

        $('#preset-save-div').show();
        $('#preset-load-div').hide();
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
        save(startdate, false, chageSetting, "", 0);
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
        prices["price_my"] = amount;
        if (!checkError(amount)) {
            return;
        }
        addDrink("ぷろドリンク🍺：", amount, new Date(), "杯目");
    });
    $('#hino-drink').click(function() {
        var amount = $('#hino-amount').val();
        prices["price_cast"] = amount;
        if (!checkError(amount)) {
            return;
        }
        addDrink("キャスドリ🍹：", amount, new Date(), "杯目");
    });
    $('#sp-drink').click(function() {
        var amount = $('#sp-amount').val();
        prices["price_shot"] = amount;
        if (!checkError(amount)) {
            return;
        }
        addDrink("ショット🥃：", amount, new Date(), "杯目");
    });
    $('#other-drink').click(function() {
        var amount = $('#other-amount').val();
        prices["price_other"] = amount;
        if (!checkError(amount)) {
            return;
        }
        addDrink("他ドリンク🥂：", amount, new Date(), "杯目");
    });

    // 場内指名。押したあとは
    $('#jyonai-shimei').click(function() {
        var amount = $('#jyonai-shimei-amount').val();
        prices["price_shimei"] = amount;
        if (!checkError(amount)) {
            return;
        }
        addDrink("単発場内指名☝️：", amount, new Date(), "指名");
    });
    $('#endless-jyonai-shimei').click(function() {
        var amount = $('#endless-jyonai-shimei-amount').val();
        prices["price_endless_shimei"] = amount;
        if (!checkError(amount)) {
            return;
        }
        addDrink("永続場内指名✌️：", amount, new Date(), "指名");

        // エンドレスの場合は一生有効にする。
        endlessJyonaiShimei = amount;
        $('#endless-jyonai-shimei').prop('disabled', true);
    });

    $('#cacheclear').click(function() {
        alert("保存してあるデータを削除します");
        store.clearAll();
        location.reload();
    });


    $('#save-preset').click(function() {
        presetCount++;
        save(startdate, false, chageSetting, jsonText, presetCount);
        alert("お店情報を保存しました。");
    });


    $('#pro-amount').change(function() {
        var amount = $('#pro-amount').val();
        prices["price_my"] = amount;
        if (!checkError(amount)) {
            return;
        }
        save(startdate, true, chageSetting, jsonText, 0);
    });
    $('#hino-amount').change(function() {
        var amount = $('#hino-amount').val();
        prices["price_cast"] = amount;
        if (!checkError(amount)) {
            return;
        }
        save(startdate, true, chageSetting, jsonText, 0);
    });
    $('#sp-amount').change(function() {
        var amount = $('#sp-amount').val();
        prices["price_shot"] = amount;
        if (!checkError(amount)) {
            return;
        }
        save(startdate, true, chageSetting, jsonText, 0);
    });
    $('#other-amount').change(function() {
        var amount = $('#other-amount').val();
        prices["price_other"] = amount;
        if (!checkError(amount)) {
            return;
        }
        save(startdate, true, chageSetting, jsonText, 0);
    });
    $('#jyonai-shimei-amount').change(function() {
        var amount = $('#jyonai-shimei-amount').val();
        prices["price_shimei"] = amount;
        if (!checkError(amount)) {
            return;
        }
        save(startdate, true, chageSetting, jsonText, 0);
    });
    $('#endless-jyonai-shimei-amount').change(function() {
        var amount = $('#endless-jyonai-shimei-amount').val();
        prices["price_endless_shimei"] = amount;
        if (!checkError(amount)) {
            return;
        }
        save(startdate, true, chageSetting, jsonText, 0);
    });

    $('#myCheckbox').change(function() {
      if ($(this).is(':checked'))
      {
        alert("保存したお店ボタンをクリックすると削除します。\n削除すると戻せないので注意してください。");
      }
    });



    $('#shopNameSetting').focus(function() {
      $(this).select();
    });
    $('#numSetting').focus(function() {
      $(this).select();
    });
    $('#firstTimeChargeTimeSetting').focus(function() {
      $(this).select();
    });
    $('#firstTimeChargeMoneySetting').focus(function() {
      $(this).select();
    });
    $('#chargeTimeSetting').focus(function() {
      $(this).select();
    });
    $('#chageSetting').focus(function() {
      $(this).select();
    });
    $('#taxSetting').focus(function() {
      $(this).select();
    });
    $('#otherSetting').focus(function() {
      $(this).select();
    });
    $('#pro-amount').focus(function() {
      $(this).select();
    });
    $('#hino-amount').focus(function() {
      $(this).select();
    });
    $('#sp-amount').focus(function() {
      $(this).select();
    });
    $('#other-amount').focus(function() {
      $(this).select();
    });
    $('#jyonai-shimei-amount').focus(function() {
      $(this).select();
    });
    $('#endless-jyonai-shimei-amount').focus(function() {
      $(this).select();      
    });









});