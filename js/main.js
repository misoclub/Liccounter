isStarted = false;
startdate = new Date();

timerId = 0;
money = 0;

chageSetting = 0;
// チャージ量。
chargeMoney = 0;
tmpChargeMoney = 0;
// チャージの区切り分。
chageMinutes = 30;

taxSetting = 0;

// すべての注文情報を保持したJson。
var jsonText;
amountDetailArray = [];


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
        $('#liccounter_chageSetting').val(saveData["liccounter_chageSetting"]);
    }
    if (saveData["liccounter_taxSetting"] && saveData["liccounter_taxSetting"] != "") {
        $('#liccounter_taxSetting').val(saveData["liccounter_taxSetting"]);
    }

    // すでに開始している。
    if (saveData["liccounter_enable"] && saveData["liccounter_enable"] != "") {
        if (saveData["liccounter_enable"]) {
            isStarted = true;
            startWork(saveData["liccounter_time"]);
            $('#start').hide();
            $('#stop').show();
            $('#menu_button_0').hide();
            $('#menu_button_1').show();
            $('#menu_button_2').show();
        }
    }

    // 注文情報をすべて読み込み。
    if (saveData["liccounter_jsonText"] && saveData["liccounter_jsonText"] != "") {
        json = JSON.parse(saveData["liccounter_jsonText"]);
        json.forEach(function(value) {
            addDrink(value.name, value.amount, new Date(value.date));
        });

    }
}

function save(_time, _enable, _jikyuu, jsonText) {
    var saveData = {};
    saveData["liccounter_time"] = _time.getTime();
    saveData["liccounter_enable"] = _enable;
    saveData["liccounter_chageSetting"] = _jikyuu;
    saveData["liccounter_taxSetting"] = taxSetting;

    saveData["liccounter_jsonText"] = jsonText;

    store.set('liccounter_user_data', saveData);
}

function initialize() {

    // 前回のデータ読み込み。
    load();
}

function startWork(startTime) {
    const countUp = (IsAddDrink) => {
        // 経過時間。
        $('#timeText').text(passTime(startdate));
        // チャージ料を計算。
        var diff_time = Date.now() - startdate.getTime();
        var seconds = Math.floor(diff_time / 1000) + 1;

        // チャージ量は切り上げ。
        tmpChargeMoney = Math.ceil(seconds / (60 * chageMinutes)) * chageSetting;
        console.log(tmpChargeMoney);

        // チャージ料追加。
        if (chargeMoney != tmpChargeMoney) {
            var count = (chargeMoney / chageSetting) + 1;
            if (IsAddDrink) {
                addDrink("チャージ料：" + count + "回目👯‍♀️", chageSetting, new Date());
            }
            chargeMoney = tmpChargeMoney;
        }
    }

    // フォームに入力された値を取得。
    chageSetting = $('#chageSetting').val();
    taxSetting = $('#taxSetting').val();

    console.log(taxSetting);

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

    // もろもろ値初期化。
    countUp(!isStarted);

    // 開始日時。
    var day = dateToStr24HPad0DayOfWeek(startdate, 'YYYY年MM月DD日(WW) hh:mm');
    $('#startTimeText').text(day);

    timerId = setInterval(countUp, 1000, true);
    isStarted = true;

    return true;
}

function stopWork() {
    clearInterval(timerId);
    isStarted = false;
    alert("お会計は" + money + "円でした。\n今日も楽しめましたか？");
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

function addDrink(name, amount, date) {

    addMoney(amount);

    var nowDatText = dateToStr24HPad0DayOfWeek(date, "hh:mm");
    $("#processesTable").prepend(
        $("<tr></tr>")
        .append($("<td class='vcenter'></td>").html(nowDatText))
        .append($("<td class='vcenter'></td>").html(name))
        .append($("<td class='vcenter'></td>").html(parseInt(amount).toLocaleString() + "円"))
    );

    // お会計情報に追加して保存。
    amountDetail = {};
    amountDetail.name = name;
    amountDetail.date = date;
    amountDetail.amount = amount;
    amountDetailArray.push(amountDetail);
    jsonText = JSON.stringify(amountDetailArray);
    save(startdate, true, chageSetting, jsonText);
    console.log(jsonText);
}

function addMoney(addMoney) {

    money += parseInt(addMoney);
    taxMoney = (money * (taxSetting / 100));
    totalMoney = money + taxMoney;
    $('#moneyText').text(totalMoney.toLocaleString() + "円");
    $('#taxText').text("内税" + taxMoney.toLocaleString() + "円");
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
    });

    $('#pro-drink').click(function() {
        var amount = $('#pro-amount').val();
        addDrink("ぷろドリンク🍺", amount, new Date());
    });
    $('#hino-drink').click(function() {
        var amount = $('#hino-amount').val();
        addDrink("ひのドリンク🍹", amount, new Date());
    });
    $('#sp-drink').click(function() {
        var amount = $('#sp-amount').val();
        addDrink("ショット🥃", amount, new Date());
    });
    $('#other-drink').click(function() {
        var amount = $('#other-amount').val();
        addDrink("他ドリンク🥂", amount, new Date());
    });

    $('#cacheclear').click(function() {
        alert("保存してあるデータを削除します");
        store.clearAll();
        location.reload();
    });
});