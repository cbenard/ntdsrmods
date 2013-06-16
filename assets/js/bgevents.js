var Version = "0.37";
var LogonName = undefined;

var tabIDs = [];
// 1 minute in between notifications at least
var acceptableNotificationTime = 60 * 1000;
var lastNotificationTime;
var notificationID = "clockOutNotification";
var lastNotificationTabID;

function onMessage(request, sender, responseCallback)
{
	if (request && request.eventName)
	{
		if (sender && sender.tab && sender.tab.id && sender.tab.id > 0 &&
			$.inArray(sender.tab.id, tabIDs) < 0)
		{
			tabIDs.push(sender.tab.id)
		}

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
			raiseNotification(request.title, request.message, sender.tab.id, responseCallback);
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

var defaultOptions =
{
	"hoursPerWeek": 40.00,
	"notifyMe": true,
	"minuteWarning": 5,
	"endOfDayTimeHour": 17,
	"endOfDayTimeMinute": 0,
	"beginningOfDayTimeHour": 8,
	"beginningOfDayTimeMinute": 0
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
	for (var i = 0; i < tabIDs.length; i++)
	{
		var tabID = tabIDs[i];

		console.log('sending message to tab id: ' + tabID);

		chrome.tabs.sendMessage(tabID, message, function() {
			if (chrome.runtime.lastError)
			{
				// Remove the offender
				tabIDs.splice(i, 1);
			}
		});
	}
}

function raiseContentError(errorText)
{
	sendOneWayMessageToContentScript({ "eventName": "uiException", "errorText": errorText });
}

function raiseNotification(title, message, tabID, responseCallback)
{
	if (lastNotificationTime && new Date() < new Date(lastNotificationTime + acceptableNotificationTime))
	{
		// Too soon, but this isn't working yet
		responseCallback();
	}
	else
	{
		var notification = webkitNotifications.createNotification(chrome.runtime.getURL("assets/img/niblet-48.png"), title, message);
		console.log(notification);
		notification.onclick = function() { chrome.tabs.update(tabID, { active: true }); };
		notification.show();
		lastNotificationTime = new Date();
		setTimeout(function() { notification.close(); }, 10000);

		responseCallback();
	}
}

chrome.notifications.onClicked.addListener(function(incomingNotificationID) {
	if (incomingNotificationID == notificationID)
	{
		if (lastNotificationTabID)
		{
			chrome.tabs.update(lastNotificationTabID, { active: true });
		}
	}
});

chrome.runtime.onInstalled.addListener(function(details) {
	if (details.reason == 'install' || details.reason == 'update')
	{
		chrome.tabs.create({ "url": chrome.runtime.getURL('info.html') }, function() { })
	}
});