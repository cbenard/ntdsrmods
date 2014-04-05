$(function()
{
    $( "#tabs" ).tabs();

	var audio = document.getElementById('audio');
	var isDoneInitializing = false;

	$('.time-friendly').timepicker({
		'minTime': '6:00am',
		'maxTime': '11:45pm',
		'step': 15,
		'timeFormat': 'g:i A'
	});

	// $(document).keypress(function(e) {
	//     if(e.which == 13) {
	//     	e.preventDefault();
	//         saveSettings();
	//     }
	// });

	$('#frm').submit(function(e) {
    	e.preventDefault();
        saveSettings();
        return false;
	});
	
	$('#reset').click(function(e) {
		e.preventDefault();
		if (window.confirm('Are you sure you want to reset all the settings to the defaults?'))
		{
			chrome.runtime.sendMessage({ "eventName": "resetSettings" }, populateSettings);
		}
	});

	$('#hoursPerWeek').forcenumeric(true);
	$('#minuteWarning').forcenumeric(true);

	$('#notificationSound').change(function() 
	{
		var sndFile = $(this).val();
		if (isDoneInitializing && sndFile)
		{
			setTimeout(function() {
				audio.src = 'assets/audio/' + sndFile + '.ogg';
				audio.play();
			},1);
		}
	});
	
	$('#notifyMe').click(function() { toggleNotificationSubSettings($(this).prop('checked')); });

	$('input[type="text"]').first().focus();

	var currentSettings = null;

	chrome.runtime.sendMessage({ "eventName": "getSettings" }, populateSettings);

	function populateSettings(settings)
	{
		currentSettings = settings;

		if (settings != undefined)
		{
			if (settings.hoursPerWeek != undefined)
			{
				$('#hoursPerWeek').val(settings.hoursPerWeek);
			}
			if (settings.endOfDayTimeHour != undefined && settings.endOfDayTimeMinute != undefined)
			{
				$('#endOfDay').val(getTimeString(settings.endOfDayTimeHour, settings.endOfDayTimeMinute));
			}
			if (settings.beginningOfDayTimeHour != undefined && settings.beginningOfDayTimeMinute != undefined)
			{
				$('#beginningOfDay').val(getTimeString(settings.beginningOfDayTimeHour, settings.beginningOfDayTimeMinute));
			}
			if (settings.minuteWarning != undefined)
			{
				$('#minuteWarning').val(settings.minuteWarning);
			}
			if (settings.notifyMe != undefined)
			{
				$('#notifyMe').prop('checked', settings.notifyMe);
			}
			if (settings.notificationSound !== undefined)
			{
				$('#notificationSound').val(settings.notificationSound);
			}
			if (settings.displayGoToIssue != undefined)
			{
				$('#displayGoToIssue').prop('checked', settings.displayGoToIssue);
			}
			if (settings.suppressEditIssuePopup != undefined)
			{
				$('#suppressEditIssuePopup').prop('checked', settings.suppressEditIssuePopup);
			}
			if (settings.suppressAllPopups != undefined)
			{
				$('#suppressAllPopups').prop('checked', settings.suppressAllPopups);
			}
			if (settings.displayAccountManagerInServerEdit != undefined)
			{
				$('#displayAccountManagerInServerEdit').prop('checked', settings.displayAccountManagerInServerEdit);
			}
			if (settings.reEnableIssueEditScroll != undefined)
			{
				$('#reEnableIssueEditScroll').prop('checked', settings.reEnableIssueEditScroll);
			}
		}

		toggleNotificationSubSettings($('#notifyMe').prop('checked'));

		isDoneInitializing = true;
	}

	function getTimeString(hour, minute)
	{
		var ampm = ' AM';

		if (hour > 12)
		{
			hour = hour - 12;
			ampm = ' PM';
		}

		if (minute < 10)
		{
			minute = '0' + minute;
		}

		return '' + hour + ':' + minute + ampm
	}

	function toggleNotificationSubSettings(visible)
	{
		if (visible)
		{
			$('#notificationSubSettings').removeClass('hidden');
		}
		else
		{
			$('#notificationSubSettings').addClass('hidden');
		}
	}

	function saveSettings()
	{
		var isValid = true;
		var badElement = null;

		$('.time-friendly').each(function(index, element) {
			var jqElement = $(element);
			if (jqElement.val())
			{
				var matched = /^(12|11|10|[0-9])\:(60|[0-5][0-9]) (AM|PM)$/ig.test(jqElement.val());
				if (!matched)
				{
					showError(jqElement, 'Invalid time format (use picker)');
					isValid = false;
					if (!badElement)
					{
						badElement = jqElement;
					}
				}
				else
				{
					clearError(jqElement);
				}
			}
		});

		$('.hours').each(function(index, element) {
			var jqElement = $(element);
			if (jqElement.val())
			{
				var matched = /^[1-9][0-9]{0,1}(\.[0-9]{1,2})?$/ig.test(jqElement.val());
				if (!matched)
				{
					showError(jqElement, 'Hours must be 1-99.99');
					isValid = false;
					if (!badElement)
					{
						badElement = jqElement;
					}
				}
				else
				{
					clearError(jqElement);
				}
			}
		});

		$('.minutes').each(function(index, element) {
			var jqElement = $(element);
			if (jqElement.val())
			{
				var matched = /^[0-9]{1,2}$/ig.test(jqElement.val());
				if (!matched)
				{
					showError(jqElement, 'Minutes must be 0-99');
					isValid = false;
					if (!badElement)
					{
						badElement = jqElement;
					}
				}
				else
				{
					clearError(jqElement);
				}
			}
		});

		if (isValid)
		{
			persistSettings();
		}
		else
		{
			showErrorSummary('Please fix the errors below.');
			if (badElement)
			{
				badElement.focus();
			}
		}
	}

	function showError(jqElement, errorMessage)
	{
		$('#val-msg-' + jqElement.attr('id'))
			.html(errorMessage)
			.addClass('val-error')
			.removeClass('val-valid');
	}

	function clearError(jqElement)
	{
		$('#val-msg-' + jqElement.attr('id'))
			.text(' ')
			.removeClass('val-error')
			.addClass('val-valid');
	}

	function persistSettings()
	{
		try
		{
			var beginTimeDto = getTimeParts($('#beginningOfDay'));
			var endTimeDto = getTimeParts($('#endOfDay'));

			var dto =
			{
				"hoursPerWeek": parseFloat($('#hoursPerWeek').val()).toFixed(2),
				"beginningOfDayTimeHour": beginTimeDto.hour,
				"beginningOfDayTimeMinute": beginTimeDto.minute,
				"endOfDayTimeHour": endTimeDto.hour,
				"endOfDayTimeMinute": endTimeDto.minute,
				"notifyMe": $('#notifyMe').prop('checked') ? true : false,
				"minuteWarning": $('#minuteWarning').val() ? parseInt($('#minuteWarning').val()) : 0,
				"notificationSound": $('#notificationSound').val(),
				"displayGoToIssue": $('#displayGoToIssue').prop('checked') ? true : false,
				"suppressEditIssuePopup": $('#suppressEditIssuePopup').prop('checked') ? true : false,
				"suppressAllPopups": $('#suppressAllPopups').prop('checked') ? true : false,
				"displayAccountManagerInServerEdit": $('#displayAccountManagerInServerEdit').prop('checked') ? true : false,
				"reEnableIssueEditScroll": $('#reEnableIssueEditScroll').prop('checked') ? true : false
			};

			chrome.runtime.sendMessage({ "eventName": "saveSettings", "dto": dto }, function(response) {
				if (response && response.success != undefined && (response.success || response.errorMessage))
				{
					if (response.success)
					{
						showSuccessSummary('Successfully saved settings.');
						window.setTimeout(window.close, 1000);
					}
					else
					{
						showErrorSummary('Error saving: ' + response.errorMessage);
					}
				}
				else
				{
					showErrorSummary('Unknown error saving.');
				}
			});
		}
		catch (ex)
		{
			showErrorSummary('Exception: ' + ex);
		}
	}

	function getTimeParts(jqElement)
	{
		var matches = /^(12|11|10|[0-9])\:(60|[0-5][0-9]) (AM|PM)$/ig.exec(jqElement.val());
		if (!matches || matches.length != 4)
		{
			showErrorSummary('Unable to parse beginning time.');
			showError(jqElement, 'Invalid time (use picker)');
			return;
		}

		var dto =
		{
			"hour": parseInt(matches[1], 10),
			"minute": parseInt(matches[2], 10)
		};

		if (matches[3].toLowerCase() == 'pm')
		{
			dto.hour += 12;
		}

		return dto;
	}

	function showErrorSummary(errorText)
	{
		$('.response-success').addClass('hidden');
		$('.response-error').removeClass('hidden').children('.contents').text(errorText);
		$('.response-error').effect('highlight', 'fast');
	}

	function showSuccessSummary(successText)
	{
		$('.response-error').addClass('hidden');
		$('.response-success').removeClass('hidden').children('.contents').text(successText);
		$('.response-success').effect('highlight', 'fast');
	}
})
