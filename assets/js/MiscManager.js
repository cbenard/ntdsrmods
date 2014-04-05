(function (exports) {
	exports.MiscManager = function(inputContext, location) {
		var location = location;
		var context = inputContext;
		var currentSettings;
		var insertedBodyKeypress = false;
		var hasEnabledScrolling = false;
		var serverEditRegExp = new RegExp("/P.{6}ServerEdit.aspx?.*ID=", "i");

	    this.isValidPage = function() {
	    	// In case we need to exclude pages in the future
	        return true;
	    };

	    this.refresh = function(settings) {
	        handleSettingsReceived(settings);
	    };

	    function handleSettingsReceived(settings) {
	        currentSettings = settings;

	    	if (typeof settings !== 'undefined')
	    	{
	            doStartup();
	        }
	    }

	    function doStartup() {
	        console.log('MiscManager doing startup with these settings:');
	        console.log(currentSettings);

    		if (typeof currentSettings !== 'undefined') {
				displayGoToIssue(currentSettings.displayGoToIssue);

				displayAccountManagerInServerEdit(currentSettings.displayAccountManagerInServerEdit);

				reEnableIssueEditScroll(currentSettings.reEnableIssueEditScroll);
    		}
	    }

	    function displayAccountManagerInServerEdit(shouldDisplayAccountManagerInServerEdit) {
	    	console.log('in display: should display: ' + shouldDisplayAccountManagerInServerEdit +
	    		', location: ' + location + ', valid: ' + serverEditRegExp.test(location));

	    	if (shouldDisplayAccountManagerInServerEdit && serverEditRegExp.test(location) &&
	    		$('#accountManagerName', context).length === 0) {
	            var request = { eventName: "getComboValue", id: 'cmbLocationQuickSearch_cmbLocationQuickSearch' };
	            console.log('sending message to window:' + JSON.stringify(request) + ', ' + location);
	            exports.postMessage(request, location);
			}
			else if (!shouldDisplayAccountManagerInServerEdit && $('#accountManagerName', context).length > 0) {
				$('#accountManagerName', context).remove();
			}
		}

	    function reEnableIssueEditScroll(shouldReEnableIssueEditScroll) {
	    	if (shouldReEnableIssueEditScroll) {
				// Re-enable scroll in separate windows for IssueEdit
				if (exports.innerHeight != 830 && /IssueEdit.aspx/i.test(location)) {
					$('html,body,form,.GreyFrameWhiteAdminBG').css('height', 'auto').css('overflow-y', 'visible').css('overflow-x', 'visible');
					hasEnabledScrolling = true;
				}
				else if (/IssueEdit.aspx/i.test(location)) {
					$(exports).resize(function() {
						if (!hasEnabledScrolling) {
							$('html,body,form,.GreyFrameWhiteAdminBG').css('height', 'auto').css('overflow-y', 'visible').css('overflow-x', 'visible');
							hasEnabledScrolling = true;
						}
					});
				}
			}
		}

		function displayGoToIssue(shouldDisplayGoToIssue) {
			if (/IssueMyListAdvanced.aspx/i.test(location)) {
				var alreadyExists = $('#issueDirectRow', context).length > 0;
				if (alreadyExists) {
					if (!shouldDisplayGoToIssue) {
						$('#issueDirectRow', context).remove();
					}
				}
				else {
					if (shouldDisplayGoToIssue) {
						var div = $('<div id="issueDirect" style="display: table-cell; padding-left: 15px" class="FormElement"></div>', context);
						var input = $("<input id='issueNumberDirect' type='text' value=''></input>", context);
						div.append(input);
						var button = $("<input type='button' value='Go' />", context);
						button.click(function() {
							exports.open('IssueEdit.aspx?IssueNumber=' + input.val());
						});
						div.append(button);
						var label = $('<span class="FormLabel" style="display: table-cell;">Go to Issue #</span>', context);
						var row = $('<div id="issueDirectRow" style="display: table-row;"></div>', context);
						var innerRow = $('<div></div>', context);
						row.append(innerRow);
						innerRow.append(label);
						innerRow.append(div);
						
						$('#ctl00_ContentPlaceHolder2_divChooseDeveloper', context).parent().parent().prepend(row);
						
						if (!insertedBodyKeypress) {
							$('body', context).keypress(function(evt) {
								if (evt.which == 47 && $('#issueNumberDirect', context).length > 0) {
									evt.preventDefault();
									$('#issueNumberDirect', context).focus();
								}
							});
							insertedBodyKeypress = true;
						}
						
						$('#issueNumberDirect', context).keypress(function(evt) {
							if (evt.which == 13) {
								evt.preventDefault();
								
								exports.open('IssueEdit.aspx?IssueNumber=' + this.value);
							}
							else if (evt.which > 31 && (evt.which < 48 || evt.which > 57)) {
								evt.preventDefault();
							}
						});
						
						$('#issueNumberDirect', context).keyup(function(evt) {
							if (/\D/.test($(this).val())) {
								$(this).val($(this).val().replace(/\D/g, ''));
							}
						});
						
						$('#issueNumberDirect', context).focus(function() {
							$(this).select();
							exports.setTimeout(function() { $('#issueNumberDirect', context).select(); }, 100);
						});
					}
				}
			}
		} // displayGoToIssue

		function onWindowMessage(evt) {
			if(evt.source === exports) {
				console.log(evt);
				var request = evt.data;

				if (request.eventName === "gotComboValue" && request.val) {
					handleGotComboValue(request.val);
				}

				/* In case we want to do callback later
				if (typeof request.callback === 'function') {
					callback();
				}*/
			}
		}

		exports.addEventListener('message', onWindowMessage, false);

		function handleGotComboValue(val) {
			console.log('content script received gotComboValue message:' + (val ? val : 'undefined value'));

			var locationID = val;
			if (!locationID) {
				console.log('unable to determine locationID from location quick search');
				return;
			}

			var locationURL = 'https://www.' + voldemort + '.com/LocationEdit.aspx?LocationID=' + locationID;

			$.get(locationURL, function (data) {
				var accountMgr = $(data).find('#cmbTechnicalAccountManager_cmbPerson_Input');
				if (accountMgr && accountMgr.val() && accountMgr.val().length > 0) {
					$('#pnlEditFields tr')
						.first()
						.after('<tr id="accountManagerName"><td class="formLabel">Account Manager</td><td class="formElement">' + accountMgr.val().replace("  ", " ") + '</td></tr>');
				}
			});
		}
	}
})(window);