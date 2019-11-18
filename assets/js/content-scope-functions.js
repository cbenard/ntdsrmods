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
		console.logv(evt);
		var request = evt.data;
		if (request.eventName === "settingsUpdated" && request.settings) {
			console.logv('content script received settingsUpdated message:');
			console.logv(request.settings);

			window.currentPesMiscSettings = request.settings;
		}
		else if (request.eventName === "getComboValue" && request.comboID) {
			if (logVerbose) console.log('content script received getComboValue message: ' + (request.comboID ? request.comboID : 'undefined'));

			var quickSearch = $find(request.comboID);
			if (!quickSearch) {
				console.logv('unable to find quick search');
				return;
			}

			var quickSearchVal = quickSearch.get_value();
			if (!quickSearchVal) {
				console.logv('unable to determine value from quick search');
				return;
			}

			var request = { eventName: "gotComboValue", comboID: request.comboID, val: quickSearchVal, location: window.location.href };
			if (logVerbose) console.log('sending message to window:' + JSON.stringify(request) + ', ' + window.location.href);
			window.postMessage(request, window.location.href);
		}
		else if (request.eventName === "editDailyStatusGeneratedItem" && typeof request.linkTypeID !== 'undefined' && request.contentID) {
			editDailyStatusGeneratedItem(request.linkTypeID, request.contentID);
		}
		else if (request.eventName === "editIssue" && typeof request.issueID !== 'undefined' && request.issueID) {
			EditIssue(request.issueID);;
		}
		else if (request.eventName === "findRadGridColumnIndex") {
			findRadGridColumnIndex(request);
		}
		else if (request.eventName === "getRadComboBoxValue") {
			getRadComboBoxValue(request);
		}
		else if (request.eventName === "performQuickSearch") {
			performQuickSearch(request);
		}
	}
}

function findRadGridColumnIndex(request) {
	try {
		var foundColumnIndex;
		var grid = $find(request.gridClientID);
		if (grid && grid.constructor === Telerik.Web.UI.RadGrid) {
			var cols = $find(request.gridClientID)
				.get_masterTableView()
				.get_columns();
			
			for (var i = 0; i < cols.length; i++) {
				if (cols[i].get_uniqueName() === request.columnName) {
					foundColumnIndex = i;
					break;
				}
			}
		}
		if (foundColumnIndex !== undefined) {
			window.postMessage({
				eventName: 'foundRadGridColumnIndex',
				gridClientID: request.gridClientID,
				columnName: request.columnName,
				foundColumnIndex: foundColumnIndex
			}, window.location.href);
		}
	} catch (err) {
		console.log('error finding rad grid column:');
		console.log(err);
	}
}

function performQuickSearch(request) {
	try {
		var quickSearch = $find(request.comboID);
		var button = $('#' + request.buttonID);

		if (!quickSearch) {
			console.log('unable to find quick search: ' + request.comboID);			
			return;
		}
		if (!button || button.length == 0) {
			console.log('unable to find button: ' + request.buttonID);			
			return;
		}

		quickSearch.set_text(request.searchValue);

		button.click();
	} catch (err) {
		console.log('error performing quick search:');
		console.log(err);
	}
}

window.addEventListener('message', onMessage, false);

console.logv('loaded content-scope-functions.js');