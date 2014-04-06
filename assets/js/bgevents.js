var LogonName = undefined;

// 1 minute in between notifications at least
var acceptableNotificationTime = 60 * 1000;
var lastNotificationTime;
var notificationID = "clockOutNotification";
var lastNotificationTabID;
var oldExtensionID = 'imdhbhbmbnnlaffbhhhjccnighckieja';

function onMessage(request, sender, responseCallback)
{
	if (request && request.eventName)
	{
		if (request.eventName == "pageLoaded")
		{
			console.logv('received pageLoaded');
			pageLoaded(sender, request.logonName);
		}
		else if (request.eventName == "needsPageAction")
		{
			console.logv('received needsPageAction');
			placePageAction(sender);
		}
		else if (request.eventName == "getSettings" || request.eventName == "resetSettings")
		{
			if (logVerbose) console.log('received ' + request.eventName);
			if (request.eventName == "resetSettings")
			{
				chrome.storage.sync.remove('settings', function () {
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
			console.logv('received saveSettings');
			saveSettings(request.dto, responseCallback);
			return true;
		}
		else if (request.eventName == "raiseNotification")
		{
			console.logv('received raiseNotification');
			raiseNotification(request.notificationID, request.title, request.message, sender.tab.id, request.settings, responseCallback);
			return true;
		}
		else if (request.eventName == "openTab")
		{
			chrome.tabs.create({ url: request.url }, function() {});
		}
		else if (request.eventName == "ackNewVersion")
		{
			var ackedVersion = chrome.runtime.getManifest().version;
			chrome.storage.sync.set({ 'lastVersion': ackedVersion }, function() {
				var err = chrome.runtime.lastError;
				if (err)
				{
					console.log(err);
					return;
				}

				sendOneWayMessageToContentScript(request);
				if (logVerbose) console.log('Acknowledged version: ' + ackedVersion);
			});
		}
		else if (request.eventName == "setClipboard")
		{
			var text = request.copyText ? request.copyText : '';

			copyText(text);

			responseCallback();

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
	"notificationSound": "dee_doo",
	"displayGoToIssue": true,
	"suppressEditIssuePopup": true,
	"suppressAllPopups": true,
	"displayAccountManagerInServerEdit": false,
	"reEnableIssueEditScroll": true,
	"copyWithoutSilverlight": true,
	"promoteIssueEditClickableSpansToLinks": true,
	"linkIssueSubject": true,
	"displayServerSearchFromIssueEdit": true
};

function getSettings(responseCallback)
{
	chrome.storage.sync.get('settings', function(data)
	{
		console.logv('pulled from sync');
		console.logv(data);
		var settings = $.extend({}, defaultOptions, data.settings);
		console.logv('default options');
		console.logv(defaultOptions);
		console.logv('pulled from sync and extended');
		console.logv(settings);
		responseCallback(settings);
	});
}

function saveSettings(settings, responseCallback)
{
	console.logv('push to sync');
	console.logv(settings);

	chrome.storage.sync.set({ 'settings': settings }, function() {
		var err = chrome.runtime.lastError;
		if (err)
		{
			responseCallback({ 'success': false, 'errorMessage': err });
		}

		responseCallback({ 'success': true, 'errorMessage': null });

		settings = $.extend({}, defaultOptions, settings);

		sendOneWayMessageToContentScript({ "eventName": "settingsUpdated", "settings": settings });

		console.logv('sent settingsUpdated message');
	});
}

function placePageAction(sender) {
	chrome.pageAction.show(sender.tab.id);
}

function pageLoaded(sender, logonName)
{
	chrome.storage.sync.get('lastVersion', function(data)
	{
		console.logv('pulled version from sync');
		console.logv(data);

		var manifest = chrome.runtime.getManifest();
		var desiredVersion = manifest.version;
		var versionInfo = versionHistory[desiredVersion];
		if (versionInfo.sameAs !== undefined) {
			desiredVersion = versionInfo.sameAs;
			versionInfo = versionHistory[versionInfo.sameAs];
		}

		if ((!data.lastVersion || data.lastVersion !== desiredVersion) && versionInfo) {
			chrome.tabs.sendMessage(sender.tab.id, { eventName: "newVersionNotification",
				info: { heading: versionInfo.heading, message: versionInfo.message }});
		}
	});

	if (logonName)
	{
		LogonName = logonName;
		sendHeartbeat();
	}
}

function copyText(text) {
	// Adapted from http://stackoverflow.com/a/5255791/448
	var textarea = document.createElement("textarea");
	var body = document.getElementsByTagName('body')[0];
	body.appendChild(textarea);

	// now we put the message in the textarea
	textarea.value = text;

	// and copy the text from the textarea
	textarea.select();
	document.execCommand("copy", false, null);
	body.removeChild(textarea);
	if (logVerbose) console.log('copied ' + text);
}

function sendHeartbeat()
{
	if (LogonName != undefined) {
		$.ajax({
			url: 'http://ntdsrmods.chrisbenard.net/update.php',
			type: 'POST',
			data: { 'LogonName': LogonName, 'Version': chrome.runtime.getManifest().version },
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
	for (var j = 0; j < matchingUrls.length; j++)
	{
		chrome.tabs.query({ "url": matchingUrls[j] }, function(tabs) {
			if (tabs && tabs.length > 0)
			{
				for (var i = 0; i < tabs.length; i++)
				{
					if (logVerbose) console.log('sending message to tab id: ' + tabs[i].id);

					chrome.tabs.sendMessage(tabs[i].id, message, function() {
						if (chrome.runtime.lastError)
						{
							console.log('error sending to tab:');
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

function raiseNotification(notificationID, title, message, tabID, settings, responseCallback)
{
	if (lastNotificationTime && new Date() < new Date(lastNotificationTime.getTime() + acceptableNotificationTime))
	{
		if (logVerbose) {
			console.log('not notifying. last update time: ' +
			lastNotificationTime + '. waiting until ' +
			new Date(lastNotificationTime.getTime() + acceptableNotificationTime));
		}
		// Too soon, but this isn't working yet
		responseCallback();
	}
	else
	{
		var notificationOptions = {
			type: "basic",
			title: title,
			message: message,
			iconUrl: chrome.runtime.getURL("assets/img/niblet-128.png"),
			buttons: [
				{ title: "Go to Daily Status", iconUrl: chrome.runtime.getURL("assets/img/icon-clock-grey-32.png")},
				{ title: "Close", iconUrl: chrome.runtime.getURL("assets/img/icon-close-grey-32.png")}
			],
			isClickable: true
		};
		chrome.notifications.getAll(function (openNotifications) {
			if (!openNotifications.timewarning) {
				chrome.notifications.create("timewarning", notificationOptions, function() {
					if (settings && settings.notificationSound)
					{
						if (logVerbose) console.log(chrome.runtime.getURL("assets/audio/" + settings.notificationSound + ".ogg"));
						setTimeout(function() {
							var notificationAudio = new Audio();
							notificationAudio.src = chrome.runtime.getURL("assets/audio/" + settings.notificationSound + ".ogg");
							notificationAudio.play();
						}, 1);
					}

					lastNotificationTabID = tabID;
					lastNotificationTime = new Date();
				});
			}
		});

		responseCallback();
	}
}

function raiseUpdateNotification(message)
{
	var notificationOptions = {
		type: "basic",
		title: "Daily Status Mods Updated",
		message: "New features: Sound options (defaults on). \"Time you can leave\" " +
				 "wraps to the next day (so be sure to set the \"Beginning of Day\" " +
				 "correctly) and Monday clock-in support (finally!). Click for more information.",
		iconUrl: chrome.runtime.getURL("assets/img/niblet-128.png"),
		buttons: [
			{ title: "More Information", iconUrl: chrome.runtime.getURL("assets/img/icon-clock-grey-32.png")},
			{ title: "Close", iconUrl: chrome.runtime.getURL("assets/img/icon-close-grey-32.png")}
		],
		isClickable: true
	};
	chrome.notifications.create("updatenotification", notificationOptions, function() {});
}

function HandleNotificationButtonClick(notificationID, buttonIndex) {
	chrome.notifications.clear(notificationID, function() {});

	if (notificationID === "updatenotification") {
		if (logVerbose) console.log('update notification: user clicked button index ' + buttonIndex);
		if (buttonIndex === 0 || buttonIndex === -1) {
			chrome.tabs.create({ url: chrome.runtime.getURL("info.html") }, function() {});
		}
	}
	else if (notificationID === "timewarning") {
		if (logVerbose) console.log('time warning notification: user clicked button index ' + buttonIndex);
		if (buttonIndex === 0 || buttonIndex === -1) {
			chrome.tabs.get(lastNotificationTabID, function(lastTab) {
				if (lastTab) {
					focusTab(lastTab);
				}
				else {
					chrome.tabs.query({ url: "*://*/*/DailyStatusListForPerson.aspx" }, function (tabResults) {
						if (tabResults && tabResults.length > 0) {
							focusTab(tabResults[0]);
						}
					});
				}
			});
		}
	}
}

function focusTab (tab) {
	chrome.windows.update(tab.windowId, { focused: true }, function (updatedWindow) {
		chrome.tabs.update(tab.id, { active: true }, function () {});
	});
}

chrome.runtime.onInstalled.addListener(function(details) {
	if (details.reason == 'install') // This is annoying with frequent updates... || details.reason == 'update')
	{
		chrome.tabs.create({ "url": chrome.runtime.getURL('info.html') }, function() { });
	}
	// else if (details.reason == 'update')
	// {
	// 	raiseUpdateNotification();
	// }

	chrome.management.get(oldExtensionID, function(data) {
		if (data) {
			chrome.management.uninstall(oldExtensionID, { showConfirmDialog: false }, function() {
				if (chrome.extension.lastError)
				{
					console.log('error uninstalling dev site extension:');
					console.log(chrome.extension.lastError);
				}
			});
		}
	});

	for (var j = 0; j < matchingUrls.length; j++)
	{
		chrome.tabs.query({ "url": matchingUrls[j] }, function(tabs) {
			if (tabs && tabs.length > 0)
			{
				for (var i = 0; i < tabs.length; i++)
				{
					if (logVerbose) console.log('reloading matching tab ' + tabs[i].id + ' with url ' + tabs[i].url);
					chrome.tabs.reload(tabs[i].id);
				}
			}
		});
	}
});

// http://stackoverflow.com/a/17246127/448
chrome.omnibox.onInputChanged.addListener(function (text, suggest) {
	// Add suggestions to an array
    var suggestions = [];
    if (text.length <= 1 || 'issue'.substring(0, Math.min(text.length, 5)) == text.substring(0, Math.min(text.length, 5))) {
	    suggestions.push({ content: 'issue', description: 'issue <dim>Edit an issue by typing "issue 123456" or go to issues with "issue"</dim>'});
	}
    if (text.length <= 1 || 'divmanage'.substring(0, Math.min(text.length, 9)) == text.substring(0, Math.min(text.length, 9))) {
    	suggestions.push({ content: 'divmanage', description: 'divmanage <dim>Manage Download Item Versions by typing "divmanage"</dim>'});
	}
    if (text.length <= 1 || 'dsr'.substring(0, Math.min(text.length, 3)) == text.substring(0, Math.min(text.length, 3))) {
    	suggestions.push({ content: 'dsr', description: 'dsr <dim>Go directly to Daily Status or open by typing "dsr"</dim>'});
	}
    if (text.length <= 1 || 'servers'.substring(0, Math.min(text.length, 7)) == text.substring(0, Math.min(text.length, 7))) {
    	suggestions.push({ content: 'servers', description: 'servers <dim>Go directly to Server Search by typing "servers"</dim>'});
	}
    if (text.length <= 1 || 'help'.substring(0, Math.min(text.length, 4)) == text.substring(0, Math.min(text.length, 4)) ||
    	suggestions.length === 0) {
	    suggestions.push({ content: 'help', description: 'Help! <dim>What can I type here?</dim>' });
	}

    // Set first suggestion as the default suggestion
    chrome.omnibox.setDefaultSuggestion({description:suggestions[0].description});

    // Remove the first suggestion from the array since we just suggested it
    suggestions.shift();

    suggest(suggestions);
});

var searchTerms = [
	"dsr",
	"issues",
	"divmanage",
	"servers",
	"help"
];

chrome.omnibox.onInputEntered.addListener(function (text, disposition) {
	for (var i = 0; i < searchTerms.length; i++) {
		if (searchTerms[i].length >= text.trim().length &&
			searchTerms[i].substring(0, text.trim().length) == text.trim().toLowerCase()) {
			var otherMatch = false;
			for (var j = 0; j < searchTerms.length; j++) {
				if (j !== i && searchTerms[j].length >= text.trim().length &&
					searchTerms[j].substring(0, text.trim().length) == text.trim().toLowerCase()) {
					otherMatch = true;
					if (logVerbose) console.log(text + ' was ambiguous. matched "' + searchTerms[i] + '" and "' + searchTerms[j] + '"');
				}
			}
			if (!otherMatch) {
				if (logVerbose) console.log('replacing search "' + text + '" with "' + searchTerms[i] + '"');
				text = searchTerms[i];
			}
			break;
		}
	}

	if (logVerbose) console.log('searching for: ' + text);

	if (/^dsr/i.test(text)) {
		navigateOmniTab('/SupportCenter/DailyStatusListForPerson.aspx', 'http', disposition, "*/DailyStatusListForPerson.aspx");
	}
	else if (/^divmanage/i.test(text)) {
		navigateOmniTab('/Updater/DownloadItemVersionPermissionManage.aspx', 'http', disposition, "*/DownloadItemVersionPermissionManage.aspx");
	}
	else if (/^servers/i.test(text)) {
		var miniVoldemort = 'P' + voldemort.substring(1, 7);
		navigateOmniTab('/SupportCenter/' + miniVoldemort + 'ServerSearch.aspx', 'https', disposition, "*/" + miniVoldemort + 'ServerSearch.aspx');
	}
	else if (/^i(ssues?)? ([0-9]+)/i.test(text)) {
		var match = /^i(ssues?)? ([0-9]+)/i.exec(text);
		console.log(match);
		var issueNumber = match[2];
		navigateOmniTab('/SupportCenter/IssueEdit.aspx?IssueNumber=' + issueNumber, 'https', disposition, "*/IssueEdit.aspx?IssueNumber=" + issueNumber);
	}
	else if (/^i(ssues?)?/i.test(text)) {
		navigateOmniTab('/SupportCenter/IssueMyListAdvanced.aspx', 'https', disposition, "*/IssueMyListAdvanced.aspx");
	}
	else {
		navigateOmniTab(chrome.runtime.getURL('omniboxhelp.html'), null, disposition);
	}
});

function navigateOmniTab(url, proto, disposition, existingTabPattern) {
	var chromePrefix = 'chrome-extension://';

	if (url.length < chromePrefix.length || url.substring(0, chromePrefix.length) !== chromePrefix) {
		proto = proto ? proto : 'http';
		url = proto + '://www.' + voldemort + '.com' + url;
	}

	if (existingTabPattern) {
		existingTabPattern = "*://*." + voldemort + ".com/" + existingTabPattern;

		chrome.tabs.query({ url: existingTabPattern }, function (tabResults) {
			if (tabResults && tabResults.length > 0) {
				focusTab(tabResults[0]);
			}
			else {
				openOmniTab(url, disposition);
			}
		});
	} else {
		openOmniTab(url, disposition);
	}
}

function openOmniTab(url, disposition) {
	if (disposition === "currentTab") {
		chrome.tabs.update(undefined, { url: url, active: true }, function() {});
	}
	else {
		var isActive = disposition == "newForegroundTab";
		chrome.tabs.create({ url: url, active: isActive }, function() {});
	}
}

(function() {
	var popupSettings = { primaryPattern: matchingUrls[0], setting: 'allow' };
	if (matchingUrls.length > 1) {
		popupSettings.secondaryPattern = matchingUrls[1];
	}
	chrome.contentSettings.popups.set(popupSettings);
	if (logVerbose) console.log('set popup settings to: ' + JSON.stringify(popupSettings));
})();