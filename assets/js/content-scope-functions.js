window.popupNamedWindowOld = window.popupNamedWindow;

window.popupNamedWindow = function(url, guid, width, height) {
	if (currentPesMiscSettings.suppressAllPopups ||
		(/^IssueEdit/i.test(url) && currentPesMiscSettings.suppressEditIssuePopup)) {
		window.open(url);
	}
	else {
		popupNamedWindowOld(url, guid, width, height);
	}
}

function onMessage(evt) {
	if(evt.source === window) {
		console.log(evt);
		var request = evt.data;
		if (request.eventName === "settingsUpdated" && request.settings) {
			console.log('content script received settingsUpdated message:');
			console.log(request.settings);

			window.currentPesMiscSettings = request.settings;
		}
		else if (request.eventName === "getComboValue" && request.id) {
			console.log('content script received getComboValue message: ' + (request.id ? request.id : 'undefined'));

			var quickSearch = $find(request.id);
			if (!quickSearch) {
				console.log('unable to find quick search');
				return;
			}

			var quickSearchVal = quickSearch.get_value();
			if (!quickSearchVal) {
				console.log('unable to determine value from quick search');
				return;
			}

			var request = { eventName: "gotComboValue", val: quickSearchVal };
            console.log('sending message to window:' + JSON.stringify(request) + ', ' + window.location.href);
            window.postMessage(request, location);
		}

		/* In case we want to do callback later
		if (typeof request.callback === 'function') {
			callback();
		}*/
	}
}

window.addEventListener('message', onMessage, false);

console.log('loaded content-scope-functions.js');