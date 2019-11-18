(function (exports) {
	exports.MiscManager = function(inputContext, location) {
		var location = location;
		var context = inputContext;
		var currentSettings;
		var insertedBodyKeypress = false;
		var hasEnabledScrolling = false;
		var serverEditRegExp = new RegExp("/P.{6}ServerEdit.aspx?.*ID=", "i");
		var editDailyStatusGeneratedItemRegex = new RegExp("editDailyStatusGeneratedItem\\(([0-2]),\\s?[\"']([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})", "i");
		// Only include ones with Action (2nd parameter) omitted or Action === 0
		var editIssueRegex = new RegExp("EditIssue\\([\"']([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})[\"'](,\\s?0)?\\)", "i");
		var editIssueLinkRegex = new RegExp("^IssueEdit.aspx\\?IssueID=([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$", "i");
		var serverSearchHashRegex = new RegExp("/P.{6}ServerSearch.aspx#(LocationID|SearchText)=(.+)", "i");
		var locationSearchRegex = new RegExp("/LocationSearch.aspx#SearchText=(.+)", "i");
		var kbSearchRegex = new RegExp("/KnowledgeBaseSearch.aspx#SearchText=(.+)", "i");
		var issueListRadGridClientID = 'ctl00_ContentPlaceHolder2_rgMyIssues_dgResults';
		var issueSearchRadGridClientID = 'ctl00_ContentPlaceHolder2_dgSearch';
		var subjectColumn = 'Subject';
		var numberOfSentinels;

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
	        console.logv('MiscManager doing startup with these settings:');
	        console.logv(currentSettings);

    		if (typeof currentSettings !== 'undefined') {
				// Disabled: displayGoToIssue(currentSettings.displayGoToIssue);
				displayAccountManagerInServerEdit(currentSettings.displayAccountManagerInServerEdit);
				reEnableIssueEditScroll(currentSettings.reEnableIssueEditScroll);
				copyWithoutSilverlight(currentSettings.copyWithoutSilverlight);
				promoteIssueEditClickableSpansToLinks(currentSettings.promoteIssueEditClickableSpansToLinks);

				if (/\/IssueMyListAdvanced\.aspx/i.test(location) ||
					/\/IssueSearchAdvanced\.aspx/i.test(location)) {
					linkIssueSubject(currentSettings.linkIssueSubject);
					requestSupportRequestsCount();
					placeSentinels();
				}
				else if (/\/DailyStatusListForPerson\.aspx/i.test(location)) {
					requestSupportRequestsCount();
				}
				else if (/\/IssueEdit\.aspx/i.test(location)) {
					displayServerSearchFromIssueEdit(currentSettings.displayServerSearchFromIssueEdit);
				}
				else if (serverSearchHashRegex.test(exports.location.href)) {
					handleServerSearchLoad();
				}
				else if (locationSearchRegex.test(exports.location.href)) {
					handleLocationSearchLoad();
				}
				else if (kbSearchRegex.test(exports.location.href)) {
					handleKnowledgeBaseSearchLoad();
				}
    		}
	    }

	    function createSentinelDiv() {
	    	var sentinel = context.createElement('div');
	    	sentinel.setAttribute('class', 'ntdsrmods-sentinel');
	    	sentinel.setAttribute('style', 'display:none');
	    	return sentinel;
	    }

	    function placeSentinels() {
	    	var ajaxPanels = $('.RadAjaxPanel', context);
	    	if (ajaxPanels && ajaxPanels.length) {
	    		numberOfSentinels = ajaxPanels.length;
	    		for (var i = 0; i < ajaxPanels.length; i++) {
	    			if ($(ajaxPanels[i]).find('.ntdsrmods-sentinel').length === 0) {
		    			console.logv('appending sentinel');
		    			ajaxPanels[i].appendChild(createSentinelDiv());
	    			}
    			}
	    		exports.setInterval(checkSentinels, 1000);
	    	}
	    }

	    function checkSentinels() {
	    	var ajaxPanels = $('.RadAjaxPanel', context);
	    	var sentinels = $('.ntdsrmods-sentinel', context);

	    	if (ajaxPanels.length != sentinels.length) {
	    		if (logVerbose) console.log('ajaxPanels.length: ' + ajaxPanels.length + ' != sentinels.length: ' + sentinels.length);
	    		doStartup();
	    	}
	    }

	    function requestSupportRequestsCount() {
		    chrome.runtime.sendMessage({"eventName": "supportRequestsRequest"});
		}

	    this.updateSupportRequests = function(count) {
	    	console.logv('received support requests: ' + count);
	    	var issueListSupportRequestButton = $('#ctl00_ContentPlaceHolder2_RadToolBar1').find('a > span > span > span > span:contains("Support Requests")');
	    	console.logv(issueListSupportRequestButton);
	    	if (issueListSupportRequestButton && issueListSupportRequestButton.length) {
	    		issueListSupportRequestButton.text('Support Requests (' + count + ')');
	    	}

	    	var supportRequestContainer = $('#supportrequest-container');
	    	if (supportRequestContainer && supportRequestContainer.length) {
	    		$('#supportrequest-count').text(count);
	    		if (count == 0 || count > 1) {
	    			$('#supportrequest-plural').css('display', '');
	    		}
	    		else {
	    			$('#supportrequest-plural').css('display', 'none');
	    			supportRequestContainer.addClass('ntdsrmods-hidden');
	    		}
	    		supportRequestContainer.removeClass('ntdsrmods-hidden');
	    	}
	    }

	    function displayAccountManagerInServerEdit(shouldDisplayAccountManagerInServerEdit) {
	    	if (logVerbose) {
	    		console.log('in display: should display: ' + shouldDisplayAccountManagerInServerEdit +
	    			', location: ' + location + ', valid: ' + serverEditRegExp.test(location));
    		}

	    	if (shouldDisplayAccountManagerInServerEdit && serverEditRegExp.test(location) &&
	    		$('#accountManagerName', context).length === 0) {
	            var request = { eventName: "getComboValue", comboID: 'cmbLocationQuickSearch_cmbLocationQuickSearch' };
	            if (logVerbose) console.log('sending message to window:' + JSON.stringify(request) + ', ' + location);
	            exports.postMessage(request, location);
			}
			else if (!shouldDisplayAccountManagerInServerEdit && $('#accountManagerName', context).length > 0) {
				$('#accountManagerName', context).remove();
			}
		}

		function displayServerSearchFromIssueEdit(shouldDisplayServerSearchFromIssueEdit) {
			if (!shouldDisplayServerSearchFromIssueEdit && $('#cmbIssueLocationSearch_lblClipboard a').length > 0) {
				$('#cmbIssueLocationSearch_lblClipboard').html('Multiple servers');
			}
			else {
	            var request = { eventName: "getComboValue", comboID: 'cmbIssueLocationSearch_cmbLocation' };
	            if (logVerbose) console.log('sending message to window:' + JSON.stringify(request) + ', ' + location);
	            exports.postMessage(request, location);
			}
		}

		function handleServerSearchLoad() {
			var match = serverSearchHashRegex.exec(exports.location.href);

			if (match && match.length > 2) {
				history.replaceState({}, context.title, exports.location.pathname);
		        chrome.runtime.sendMessage({ "eventName": "needsPageAction" });
		        
				var locationID = match[2];
				if (logVerbose) console.log('handling server search for search text: ' + locationID);

	            var request = {
	            	eventName: "performQuickSearch",
	            	comboID: 'ctl00_ContentPlaceHolder2_cmbLocationQuickSearch_cmbLocationQuickSearch',
	            	searchValue: unescape(locationID),
	            	buttonID: 'ctl00_ContentPlaceHolder2_btnSearch'
	            };
	            if (logVerbose) console.log('sending message to window: ' + JSON.stringify(request) + ', ' + location);
	            exports.postMessage(request, location);
			}
		}

		function handleLocationSearchLoad() {
			var match = locationSearchRegex.exec(exports.location.href);

			if (match && match.length > 0) {
				history.replaceState({}, context.title, exports.location.pathname);
		        chrome.runtime.sendMessage({ "eventName": "needsPageAction" });
		        
				var searchText = match[1];
				if (logVerbose) console.log('handling location search for search text: ' + searchText);

	            $('.GreyFrameWhiteAdminBG input[name$=txtName]', context).val(unescape(searchText));
	            $('.GreyFrameWhiteAdminBG input[name$=btnSubmit]').click();
			}
		}

		function handleKnowledgeBaseSearchLoad() {
			var match = kbSearchRegex.exec(exports.location.href);

			if (match && match.length > 0) {
				history.replaceState({}, context.title, exports.location.pathname);
		        chrome.runtime.sendMessage({ "eventName": "needsPageAction" });
		        
				var searchText = match[1];
				if (logVerbose) console.log('handling kb search for search text: ' + searchText);

	            $('input[name$=txtSearchFor]', context).val(unescape(searchText));
	            $('input[name$=imgSubmit]').click();
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

		function copyWithoutSilverlight(shouldCopyWithoutSilverlight) {
			if (shouldCopyWithoutSilverlight) {
				$('input[id$=hidClipboardValue]')
					.each(function (i, v) {
						$(v).next().replaceWith(
							$(context.createElement('img'))
								.css('cursor', 'pointer')
								.attr('src', chrome.runtime.getURL('assets/img/icon-copy-16.png'))
								.attr('title', 'Copy "' + $(v).val() + '" to the clipboard')
								.click(function(evt) {
									chrome.runtime.sendMessage({ eventName: "setClipboard", copyText: $(v).val() }, function() {
										$(evt.target).effect('pulsate', { times: 1 }, 200, function() {
											$(evt.target)
												.attr('src', chrome.runtime.getURL('assets/img/icon-check-16.png'))
												.attr('title', 'Copied "' + $(v).val() + '" to the clipboard');
												setTimeout(function() {
													$(evt.target)
														.attr('src', chrome.runtime.getURL('assets/img/icon-copy-16.png'))
														.attr('title', 'Copy "' + $(v).val() + '" to the clipboard');
												}, 2000);
										});
									});
								}));
						});
			}
		}

		function linkIssueSubject(shouldLinkIssueSubject) {
			if (shouldLinkIssueSubject) {
					exports.postMessage({
						eventName: 'findRadGridColumnIndex',
						gridClientID: issueListRadGridClientID,
						columnName: subjectColumn
					}, exports.location.href);

					exports.postMessage({
						eventName: 'findRadGridColumnIndex',
						gridClientID: issueSearchRadGridClientID,
						columnName: subjectColumn
					}, exports.location.href);
			}
		}

		function promoteIssueEditClickableSpansToLinks(shouldPromoteIssueEditClickableSpansToLinks) {
			if (shouldPromoteIssueEditClickableSpansToLinks) {
				$('span[onclick^="javascript:editDailyStatusGeneratedItem"]', context)
					.each(function(i, v) {
						var match = editDailyStatusGeneratedItemRegex.exec($(v)[0].getAttribute('onclick'));
						if (match && match.length >= 3) {
							var linkTypeID = parseInt(match[1], 10);
							var contentID = match[2];
							var linkUrl;

							switch (linkTypeID) {
								case 0:
									linkUrl = 'IssueEdit.aspx?IssueID=' + contentID;
									break;
								case 1:
									linkUrl = '../QBIntegration/SalesOrderEdit.aspx?SalesOrderID=' + contentID;
									break;
								case 2:
									linkUrl = '../LocationEdit.aspx?LocationID=' + contentID;
									break;
								default:
									return;
							}

							var a = $(context.createElement('a'))
								.attr('href', linkUrl)
								.html($(v)[0].innerText)
								.attr('target', '_blank')
								.addClass('spanReplacementLink')
								.click(function (evt) {
									console.logv(currentSettings);
									if (!currentSettings || !currentSettings.promoteIssueEditClickableSpansToLinks) {
										evt.preventDefault();
							            var request = { eventName: "editDailyStatusGeneratedItem", linkTypeID: linkTypeID, contentID: contentID };
							            if (logVerbose) console.log('sending message to window:' + JSON.stringify(request) + ', ' + location);
							            exports.postMessage(request, location);
									}
								});
							$(v).replaceWith(a);
						}
					});

				$('span[onclick^="EditIssue("]')
					.filter(function() {
						return editIssueRegex.test($(this).attr('onclick'));
					})
					.each(function(i,v) {
						var match = editIssueRegex.exec($(v).attr('onclick'));
						if (match && match.length > 0) {
							var a = createIssueLink(match[1], $(v)[0].innerText);
							$(v).replaceWith(a);
						}
					});

				$("div.RadToolBar:contains('Support Requests'):has(a[onclick^='window.location.href = \'PersonIssueSupportRequests.aspx\''])")
					.each(function(i,v) {
						$(v).find("*").unbind('click');
						$(v).find("*").removeAttr('onclick');
						$(v).find("a:contains('Support Requests')")
							.each(function(j,w) {
								console.log('found link');
								console.log(w);
								$(w).attr('href', 'PersonIssueSupportRequests.aspx');
							});
					});
			}
		} // promoteIssueEditClickableSpansToLinks

		function createIssueLink(issueID, linkText) {
			var a = $(context.createElement('a'))
				.attr('href', 'IssueEdit.aspx?IssueID=' + issueID)
				.html(linkText)
				.attr('target', '_blank')
				.addClass('spanReplacementLink')
				.click(function (evt) {
					console.logv(currentSettings);
					if (!currentSettings || !currentSettings.promoteIssueEditClickableSpansToLinks) {
						evt.preventDefault();
			            var request = { eventName: "editIssue", issueID: match[1] };
			            if (logVerbose) console.log('sending message to window:' + JSON.stringify(request) + ', ' + location);
			            exports.postMessage(request, location);
					}
				});

			return a;
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
						var div = createGoToIssueDiv()
							.css('display', 'table-cell')
							.css('padding-left', '15px')
							.addClass('FormElement');
						var label = $('<span class="FormLabel" style="display: table-cell;">Go to Issue #</span>', context);
						var row = $('<div id="issueDirectRow" style="display: table-row;"></div>', context);
						var innerRow = $('<div></div>', context);
						row.append(innerRow);
						innerRow.append(label);
						innerRow.append(div);
						
						$('#ctl00_ContentPlaceHolder2_divChooseDeveloper', context).parent().parent().prepend(row);
					}
				}
			}
			else if (/IssueSearchAdvanced.aspx/i.test(location)) {
				var alreadyExists = $('#issueDirectRow', context).length > 0;
				if (alreadyExists) {
					if (!shouldDisplayGoToIssue) {
						$('#issueDirectRow', context).remove();
					}
				}
				else {
					if (shouldDisplayGoToIssue) {
						var div = createGoToIssueDiv()
							.css('margin-left', '-2px');
						var label = $('<td class="FormLabel" style="width: 100px;">Go to Issue #</td>', context);
						var elementContainer = $('<td class="FormElement"></td>', context);
						var row = $('<tr id="issueDirectRow"></tr>', context);

						elementContainer.append(div);
						row.append(label, elementContainer);
						
						$('div[id$="pnlSearchFieldsTop"] table:first tr:first', context).parent().prepend(row);
					}
				}
			}
		} // displayGoToIssue

		function createGoToIssueDiv() {
			var div = $('<div id="issueDirect"></div>', context);
			var input = $("<input id='issueNumberDirect' type='text' value=''></input>", context);
			div.append(input);
			var button = $("<input type='button' value='Go' />", context);
			button.click(function() {
				exports.open('IssueEdit.aspx?IssueNumber=' + input.val());
			});
			div.append(button);
			
			if (!insertedBodyKeypress) {
				$('body', context).keypress(function(evt) {
					if (evt.which == 47 && $('#issueNumberDirect', context).length > 0) {
						evt.preventDefault();
						$('#issueNumberDirect', context).focus();
					}
				});
				insertedBodyKeypress = true;
			}
			
			input
				.forcenumeric()
				.keypress(function(evt) {
				if (evt.which == 13) {
					evt.preventDefault();
					
					exports.open('IssueEdit.aspx?IssueNumber=' + this.value);
				}
				})
				.focus(function() {
					$(this).select();
					exports.setTimeout(function() { $('#issueNumberDirect', context).select(); }, 100);
				});

			return div;
		}

		function onWindowMessage(evt) {
			if(evt.source === exports) {
				console.logv(evt);
				var request = evt.data;

				if (request.eventName === "gotComboValue" && request.val) {
					handleGotComboValue(request);
				}
				else if (request.eventName === 'foundRadGridColumnIndex') {
					handleGotColumnIndex(request);
				}
			}
		}

		exports.addEventListener('message', onWindowMessage, false);

		function handleGotComboValue(request) {
			if (logVerbose) console.log('content script received gotComboValue message: ' + (request.val ? request.val : 'undefined value'));

			if (request.comboID === 'cmbLocationQuickSearch_cmbLocationQuickSearch' &&
				serverEditRegExp.test(request.location)) {
				var locationID = request.val;
				if (!locationID) {
					console.logv('unable to determine locationID from location quick search');
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
			else if (request.comboID === 'cmbIssueLocationSearch_cmbLocation' &&
				/\/IssueEdit.aspx/i.test(request.location)) {
				var locationID = request.val;
				if (!locationID) {
					console.logv('unable to determine locationID from location quick search');
					return;
				}
				
				var miniVoldemort = 'P' + voldemort.substring(1, 7);
				var serverSearchUrl = 'https://www.' + voldemort + '.com/SupportCenter/' + miniVoldemort + 'ServerSearch.aspx#LocationID=' + locationID;

				var serverLink = $(context.createElement('a'))
					.addClass('spanReplacementLink')
					.attr('href', serverSearchUrl)
					.attr('target', '_blank')
					.html('Multiple servers (click to go to server search)')
					.css('display', 'block')
					.css('margin', '4px 0px 4px 0px');

				$('#cmbIssueLocationSearch_lblClipboard').html(serverLink);
			}
		}

		function handleGotColumnIndex(request) {
			/*
					window.postMessage({
						eventName: 'foundRadGridColumnIndex',
						gridClientID: request.gridClientID,
						columnName: request.columnName,
						index: foundColumnIndex
					}, window.location.href);
			*/
			if ((request.gridClientID === issueListRadGridClientID || request.gridClientID === issueSearchRadGridClientID) &&
				request.columnName === subjectColumn) {
				var foundColumnIndex = request.foundColumnIndex + 1; // DOM selectors are 1 based. jQuery is 0 based.

				$('table.rgMasterTable tbody tr')
					.each(function(i,v) {
						var subjectNoBrs = $(v).find('td:nth-child(' + foundColumnIndex + ') nobr');
						if (subjectNoBrs.length > 0) {
							var subjectColumn = subjectNoBrs[0];
							if (subjectColumn) {
								var editLinks = $(v).find('span[onclick*="EditIssue("], a[href*="IssueEdit.aspx"]');

								var issueID;
								if (editLinks) {
									for (var i = 0; i < editLinks.length; i++) {
										if (editLinks[i].tagName === 'SPAN') {
											var match = editIssueRegex.exec(editLinks[i].getAttribute('onclick'));
											if (match && match.length > 0) {
												issueID = match[1];
												break;
											}
										}
										else if (editLinks[i].tagName === 'A') {
											var match = editIssueLinkRegex.exec(editLinks[i].getAttribute('href'));
											if (match && match.length > 0) {
												issueID = match[1];
												break;
											}
										}
									}
								}

								if (issueID) {
									var replacementTag;
									if (currentSettings.promoteIssueEditClickableSpansToLinks) {
										replacementTag = createIssueLink(issueID, subjectColumn.innerText);
									}
									else {
										replacementTag = $(context.createElement('span'))
											.addClass('spanlink')
											.attr('onclick', 'EditIssue("' + issueID + '");')
											.text(subjectColumn.innerText);
									}
									$(subjectColumn).html(replacementTag);
								}
							}
						}
					});
			}
		}
	}
})(window);