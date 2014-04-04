var Version = "0.46";
var LogonName = undefined;

// 1 minute in between notifications at least
var acceptableNotificationTime = 60 * 1000;
var lastNotificationTime;
var notificationID = "clockOutNotification";
var lastNotificationTabID;

function onMessage(request, sender, responseCallback)
{
	if (request && request.eventName)
	{
		if (request.eventName == "pageLoaded")
		{
			console.log('received pageLoaded');
			pageLoaded(sender, request.logonName);
		}
		else if (request.eventName == "getSettings" || request.eventName == "resetSettings")
		{
			console.log('received ' + request.eventName);
			if (request.eventName == "resetSettings")
			{
				chrome.storage.sync.clear(function () {
					getSettings(responseCallback);
				});
			}
			else
			{
				getSettings(responseCallback);
			}
			return true;
		}
		else if (request.eventName == "saveSettings")
		{
			console.log('received saveSettings');
			saveSettings(request.dto, responseCallback);
			return true;
		}
		else if (request.eventName == "raiseNotification")
		{
			console.log('received raiseNotification');
			raiseNotification(request.title, request.message, sender.tab.id, request.settings, responseCallback);
			return true;
		}
	}
};

chrome.runtime.onMessage.addListener(onMessage);
chrome.alarms.onAlarm.addListener(function(alarm) {
	if (alarm.name == 'ntdsrmods_heartbeat')
	{
		sendHeartbeat();
	}
});
chrome.notifications.onButtonClicked.addListener(HandleNotificationButtonClick);
chrome.notifications.onClicked.addListener(
	function (notificationID, buttonIndex) {
		HandleNotificationButtonClick(notificationID, -1);
	});


var defaultOptions =
{
	"hoursPerWeek": 40.00,
	"notifyMe": true,
	"minuteWarning": 5,
	"endOfDayTimeHour": 17,
	"endOfDayTimeMinute": 0,
	"beginningOfDayTimeHour": 8,
	"beginningOfDayTimeMinute": 0,
	"notificationSound": "dee_doo"
};

function getSettings(responseCallback)
{
	chrome.storage.sync.get('settings', function(data)
	{
		console.log('pulled from sync');
		console.log(data);
		var settings = $.extend(defaultOptions, data.settings);
		responseCallback(settings);
	});
}

function saveSettings(settings, responseCallback)
{
	console.log('push to sync');
	console.log(settings);

	chrome.storage.sync.set({ 'settings': settings }, function()
	{
		var err = chrome.runtime.lastError;
		if (err)
		{
			responseCallback({ 'success': false, 'errorMessage': err });
		}

		responseCallback({ 'success': true, 'errorMessage': null });

		sendOneWayMessageToContentScript({ "eventName": "settingsUpdated", "settings": settings });

		console.log('sent settingsUpdated message');
	});
}

function pageLoaded(sender, logonName)
{
	chrome.pageAction.show(sender.tab.id);

	if (logonName)
	{
		LogonName = logonName;
		sendHeartbeat();
	}
}

function sendHeartbeat()
{
	if (LogonName != undefined) {
		$.ajax({
			url: 'http://ntdsrmods.chrisbenard.net/update.php',
			type: 'POST',
			data: { 'LogonName': LogonName, 'Version': Version },
			dataType: 'text',
			success: function(data) {
				if (!/success/ig.test(data)) {
					chrome.alarms.create('ntdsrmods_heartbeat', { 'delayInMinutes': 5 });
				}
			},
			error: function() {
				chrome.alarms.create('ntdsrmods_heartbeat', { 'delayInMinutes': 5 });
			}
		});
	}
}

function sendOneWayMessageToContentScript(message)
{
	var matchingUrls = [ "*://*/*/DailyStatusListForPerson.aspx", "http://localhost:*/*clocked*.htm" ];
	for (var j = 0; j < matchingUrls.length; j++)
	{
		chrome.tabs.query({ "url": matchingUrls[j] }, function(tabs) {
			if (tabs && tabs.length > 0)
			{
				for (var i = 0; i < tabs.length; i++)
				{
					console.log('sending message to tab id: ' + tabs[i].id);

					chrome.tabs.sendMessage(tabs[i].id, message, function() {
						if (chrome.runtime.lastError)
						{
							console.log('error sending to tab ' + tabID + ':');
							console.log(chrome.runtime.lastError);
						}
					});
				}
			}
		});
	}
}

function raiseContentError(errorText)
{
	sendOneWayMessageToContentScript({ "eventName": "uiException", "errorText": errorText });
}

function raiseNotification(title, message, tabID, settings, responseCallback)
{
	if (lastNotificationTime && new Date() < new Date(lastNotificationTime + acceptableNotificationTime))
	{
		// Too soon, but this isn't working yet
		responseCallback();
	}
	else
	{
		var notification = webkitNotifications.createNotification(chrome.runtime.getURL("assets/img/niblet-48.png"), title, message);
		notification.onclick = function() { notification.cancel(); chrome.tabs.update(tabID, { active: true }); };
		notification.show();
		// Not sure if we should auto close since you want to see it
		//setTimeout(function() { notification.close(); }, 10000);

		if (settings && settings.notificationSound)
		{
			console.log(chrome.runtime.getURL("assets/audio/" + settings.notificationSound + ".ogg"));
			setTimeout(function() {
				var notificationAudio = new Audio();
				notificationAudio.src = chrome.runtime.getURL("assets/audio/" + settings.notificationSound + ".ogg");
				notificationAudio.play();
			}, 1);
		}

		lastNotificationTime = new Date();

		responseCallback();
	}
}

function raiseUpdateNotification(message)
{
	//var title = 'Daily Status Mods Updated';
	//var notification = webkitNotifications.createNotification(chrome.runtime.getURL("assets/img/niblet-48.png"), title, message);
	//var notification = webkitNotifications.createHTMLNotification(chrome.runtime.getURL('updatenotification.html'));
	var notificationOptions = {
		type: "basic",
		title: "Daily Status Mods Updated",
		message: "New features: Sound options (defaults on). \"Time you can leave\"" +
				 "wraps to the next day (so be sure to set the \"Beginning of Day\"" +
				 "correctly) and Monday clock-in support (finally!). Click for more information.",
		iconUrl: chrome.runtime.getURL("assets/img/niblet-128.png"),
		buttons: [
			{ title: "More Information", iconUrl: chrome.runtime.getURL("assets/img/icon-info-32.png")},
			{ title: "Close", iconUrl: chrome.runtime.getURL("assets/img/icon-check-32.png")}
		],
		isClickable: true
	};
	chrome.notifications.create("updatenotification", notificationOptions, function() {});

	//notification.onclick = function() { notification.cancel(); chrome.tabs.create({ "url": chrome.runtime.getURL('info.html') }); };
	//notification.show();
}

function HandleNotificationButtonClick(notificationID, buttonIndex) {
	if (notificationID === "updatenotification") {
		console.log('update notification: user clicked button index ' + buttonIndex);
		chrome.notifications.clear(notificationID, function() {});
		if (buttonIndex === 0 || buttonIndex === -1) {
			chrome.tabs.create({ url: chrome.runtime.getURL("info.html") }, function() {});
		}
	}
}

/*
chrome.notifications.onClicked.addListener(function(incomingNotificationID) {
	if (incomingNotificationID == notificationID)
	{
		if (lastNotificationTabID)
		{
			chrome.tabs.update(lastNotificationTabID, { active: true });
		}
	}
});
*/

chrome.runtime.onInstalled.addListener(function(details) {
	if (details.reason == 'install') // This is annoying with frequent updates... || details.reason == 'update')
	{
		chrome.tabs.create({ "url": chrome.runtime.getURL('info.html') }, function() { });
	}
	else if (details.reason == 'update')
	{
		raiseUpdateNotification();
	}

	var matchingUrls = [ "*://*/*/DailyStatusListForPerson.aspx", "http://localhost:*/*clocked*.htm" ];
	for (var j = 0; j < matchingUrls.length; j++)
	{
		chrome.tabs.query({ "url": matchingUrls[j] }, function(tabs) {
			if (tabs && tabs.length > 0)
			{
				for (var i = 0; i < tabs.length; i++)
				{
					console.log('reloading matching tab ' + tabs[i].id + ' with url ' + tabs[i].url);
					chrome.tabs.reload(tabs[i].id);
				}
			}
		});
	}
});