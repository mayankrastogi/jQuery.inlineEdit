/**
 * jquery.inlineEdit.js
 * 
 * jQuery.inlineEdit is a simple and lightweight jQuery plugin by Mayank K Rastogi
 * that allows you to edit your html table rows inline.
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Mayank K Rastogi
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
(function($) {
	$.fn.inlineEdit = initInlineEdit;

	// Default settings for the plugin
	$.fn.inlineEdit.defaults = {
		// prefix to use for custom attributes in <td> elements
		attributePrefix: 'inlineEdit-',

		// URL where form data is posted via AJAX when save button is clicked
		saveButtonURL: '#',

		// Callback functions when save button is clicked
		onAjaxFailed: function(jqXHR, textStatus, errorThrown) {}, // Called when an AJAX request fails
		onSaveFailed: function(result) {}, // Called when [success: true] is returned by server
		onSaveSuccessful: function(result) {}, // Called when [success: false] is returned by server

		// Classes for elements acting as Edit, Save and Cancel buttons
		editButtonClass: 'inlineEdit-action-edit',
		saveButtonClass: 'inlineEdit-action-save',
		cancelButtonClass: 'inlineEdit-action-cancel',

		// Classes for button containers
		editContainerClass: 'inlineEdit-edit-container', // class of the element that contains the edit button
		saveContainerClass: 'inlineEdit-save-container', // class of the element that contains the save and cancel buttons

		// Classes to be applied to input fields created dynamically
		inputFieldClass: 'inlineEdit-input', // Class for <input> tags
		selectFieldClass: 'inlineEdit-select', // Class for <select> tags
		textareaFieldClass: 'inlineEdit-textarea', // Class for <textarea> tags

		// Callback function that attaches a date picker to date type
		datePicker: null
	};

	// List of valid values for inlineEdit-type attribute
	var supportedTypes = ["date", "hidden", "number", "percentage", "select", "text", "textarea"];

	// Plugin function
	function initInlineEdit(options) {
		// Merge user-defined settings with default settings
		var settings = $.extend({}, $.fn.inlineEdit.defaults, options);

		// Show edit container and hide save container
		$('.' + settings.saveContainerClass, this).hide();
		$('.' + settings.editContainerClass, this).show();

		// Parse and construct row objects
		var rowObjects = [];

		// Iterate through each row
		$('tr', this).each(function(index, row) {
			// Create row objects
			var rowObject = {
					// Stores reference to the <tr> element associated with this rowObject
					domElement: row,
					// Stores an array of column objects within that row
					editableColumns: columnObjects(row),
					// Indicates whether the row is currently being edited
					editing: false,
					// Index of the row within the table
					rowIndex: index
				};
				// Store a reference to parent row object
			$(rowObject.editableColumns).each(function(index, columnObject) {
				columnObject.parentRowObject = rowObject;
			});
			// Store row objects in the array
			rowObjects.push(rowObject);
		});

		// Cancel Button behaviour
		$('.' + settings.cancelButtonClass, this).click(function() {
			// Get the row object that needs to be edited
			var rowObject = rowObjectForButton(this);
			if (!rowObject) {
				return false;
			}

			// Ignore click if row is not in edit mode
			if (!rowObject.editing) {
				console.log("Row not in edit mode");
				return false;
			}

			// Iterate through each column
			$(rowObject.editableColumns).each(function(index, columnObject) {
				// Replace input field with original content
				$(columnObject.domElement).html(columnObject.originalValue);
			});

			// Reset editing mode
			rowObject.editing = false;

			// Replace save container with edit container
			$('.' + settings.saveContainerClass, rowObject.domElement).hide();
			$('.' + settings.editContainerClass, rowObject.domElement).show();

			return false;
		});

		// Edit Button behaviour
		$('.' + settings.editButtonClass, this).click(
			function() {
				// Get the row object that needs to be edited
				var rowObject = rowObjectForButton(this);
				if (!rowObject) {
					return false;
				}

				// Ignore click if row is already in edit mode
				if (rowObject.editing) {
					console.log("Already in edit mode");
					return false;
				}

				if (rowObject.editableColumns) {
					// Iterate through all the editable columns inside that
					// row
					$(rowObject.editableColumns).each(
						function(index, columnObject) {
							// Store original value
							columnObject.originalValue = $(
								columnObject.domElement).html();

							// Create input field
							var inputElement = $("<input />").attr({
								type: 'text',
								class: columnObject.class ? columnObject.class : settings.inputFieldClass,
								name: columnObject.name
							})
							.val(columnObject.originalValue.trim());

							// Handle type specific cases
							var dataFunction, datePickerFunction, dataObj, optionElement, value;
							switch (columnObject.type) {
								case 'date':
									// Insert the input field in the DOM so that a date picker
									// can be attached to it
									$(columnObject.domElement).html(inputElement);
									// Get date picker callback function's name
									datePickerFunction = columnObject.datePicker;
									// Check if function name provided is a valid function
									if ($.isFunction(window[datePickerFunction])) {
										// Invoke function and pass reference to inputElement and columnObject
										window[datePickerFunction].call(inputElement[0], columnObject);
									} else if (settings.datePicker) {
										// Use datePicker from settings if defined
										settings.datePicker.call(inputElement[0], columnObject);
									} else {
										// Fall back to HTML5 date type
										$(inputElement).attr('type', 'date');
										console.log('datePickerFunction: "' + datePickerFunction + '" is invalid');
									}

									break;

								case 'hidden':
									$(inputElement).attr('type', 'hidden');
									break;

								case 'number':
									$(inputElement).attr('type', 'number');
									break;

								case 'percentage':
									$(inputElement).attr('type', 'number');
									// Remove % sign
									value = columnObject.originalValue.trim();
									$(inputElement).val(value.substr(0, value.length - 1));
									break;

								case 'select':
									// Create select input element
									inputElement = $("<select></select>").attr('name', columnObject.name).attr('class', columnObject.class ? columnObject.class : settings.selectFieldClass);
									// Get function to get data from
									dataFunction = columnObject.data;
									// Check if function name provided is a valid function
									if ($.isFunction(window[dataFunction])) {
										// Invoke function to get the data
										dataObj = window[dataFunction]();
										if (dataObj) {
											// Generate option elements from data
											$.each(dataObj, function(value, label) {
												optionElement = $("<option></option>");
												$(optionElement).attr('value', value);
												$(optionElement).html(label);

												// Set selected attribute if value matches
												if (columnObject.originalValue.trim() == label)
													$(optionElement).attr('selected', 'selected');

												$(inputElement).append(optionElement);
											});
										}
									} else {
										console.log('dataFunction: "' + dataFunction + '" is invalid');
									}
									break;
									
								case 'textarea':
									// Create textarea field
									inputElement = $("<textarea></textarea>").attr({
										class: columnObject.class ? columnObject.class : settings.textareaFieldClass,
										name: columnObject.name
									})
									.val(columnObject.originalValue.trim());
									break;
							}

							// Replace value with input field
							if(columnObject.type == 'hidden') {
								// Hidden field should not replace the value in the column
								$(columnObject.domElement).append(inputElement);
							} else if(columnObject.type != 'date'){
								// In case of date type the field has already been inserted
								// in the DOM
								$(columnObject.domElement).html(inputElement);
							}
						});
					// Set editing mode
					rowObject.editing = true;

					// Replace edit container with save container
					$('.' + settings.editContainerClass, rowObject.domElement).hide();
					$('.' + settings.saveContainerClass, rowObject.domElement).show();
				}

				return false;
			});

		// Save Button behaviour
		$('.' + settings.saveButtonClass, this).click(function() {
			// Get the row object that needs to be saved
			var rowObject = rowObjectForButton(this);
			if (!rowObject) {
				return false;
			}

			// Ignore click if row is not in edit mode
			if (!rowObject.editing) {
				console.log("Row not in edit mode");
				return false;
			}

			// Perform client-side validation
			var valid = true;
			$(rowObject.editableColumns).each(function(index, columnObject) {
				if (!valid)
					return false;

				// Check if validator provided is a valid function
				if ($.isFunction(window[columnObject.validator])) {
					// Store reference to input field on which to perform validation
					var inputField = $('input, textarea, select', columnObject.domElement)[0];
					// Initiate callback in context of the inputField
					if (!window[columnObject.validator].call(inputField)) {
						valid = false;
					}
				}
			});

			// If validation is successful post the data
			if (valid) {
				$.ajax({
					url: settings.saveButtonURL,
					type: 'post',
					data: $('input, textarea, select', rowObject.domElement).serialize(),
					dataType: 'json',
					success: function(result) {
						console.log(result);
						if (result.success) {
							// Iterate through each column
							$(rowObject.editableColumns).each(function(index, columnObject) {
								// Replace input field with new values
								if(columnObject.type == 'select')
									$(columnObject.domElement).html($('option:selected', columnObject.domElement).text());
								else
									$(columnObject.domElement).html($('input, textarea', columnObject.domElement).val());
								if (columnObject.type == 'percentage') {
									$(columnObject.domElement).append('%');
								}
							});

							// Reset editing mode
							rowObject.editing = false;
							// Replace save container with edit container
							$('.' + settings.saveContainerClass, rowObject.domElement).hide();
							$('.' + settings.editContainerClass, rowObject.domElement).show();

							// Initiate save successful callback
							settings.onSaveSuccessful.call(this, result);
						} else {
							// Initiate save failed callback
							settings.onSaveFailed.call(this, result);
						}
					},
					error: function(jqXHR, textStatus, errorThrown) {
						// Initiate ajax failed callback
						settings.onAjaxFailed.call(this, jqXHR, textStatus, errorThrown);
					}
				});
			}

			return false;
		});


		// Utility Functions

		/**
		 * Finds the value of specified inlineEdit custom attribute of an element
		 * 
		 * @param element Element on which to look for the attribute
		 * @param attribute The inlineEdit attribute to look for
		 * @returns value of the attribute if attribute is found, 'undefined' otherwise
		 */
		function extractInlineEditAttributeValue(element, attribute) {
			attribute = attribute.trim();
			var attributeValue = $(element).attr(
				settings.attributePrefix + attribute);

			if (attributeValue) {
				// Sanitize the value
				attributeValue = attributeValue.trim();
				if (attribute == 'type')
					attributeValue = attributeValue.toLowerCase();
			}
			return attributeValue;
		}

		/**
		 * Generates an array of column objects from each <td> element.
		 * The <td> element should be having at least the 'type' inlineEdit attribute
		 * 
		 * @param rowObject Element on which to look for the attribute
		 * @returns array of column objects
		 */
		function columnObjects(rowObject) {
			var columnObjects = [];

			if (rowObject) {
				// Iterate through all the columns
				$(rowObject).children().each(
					function(index, element) {
						// Determine the edit type for that column
						var type = extractInlineEditAttributeValue(element,
							'type');

						// Ignore element if type is undefined
						if (!type)
							return;

						// Ignore element if not of supported type
						if ($.inArray(type, supportedTypes) == -1)
							return;

						// Construct column object
						var columnObject = {
							// The class to be applied to the input element
							class: extractInlineEditAttributeValue(element,
								'class'),
							// The function name that will return an object containing
							// a set of key value pairs that will be used to populate list
							// of items in select menus.
							// Key denotes the text that will be displayed in the dropdown
							// Value denotes the content of value attribute of the <option> element
							data: extractInlineEditAttributeValue(element,
								'data'),
							// The function name that will be responsible to attach a date picker
							// to this input field. If not specified, the date picker function specified
							// in settings is used 
							datePicker: extractInlineEditAttributeValue(element,
								'datePicker'),
							// Reference to the <td> element associated with the column object
							domElement: element,
							// Index of the column within its row
							indexInRow: index,
							// The content of the name attribute that will be added to the
							// generated <input> or <select> element
							name: extractInlineEditAttributeValue(element,
								'name'),
							// Stores the initial value for that column
							originalValue: $(element).html(),
							// Stores a reference to its parent rowObject
							parentRowObject: null,
							// Specifies the type of input field to generate
							type: type,
							// Name of the function that will be invoked to validate the
							// input of this column before the data is posted to the server
							// upon clicking the save button
							validator: extractInlineEditAttributeValue(element, 'validator')
						};

						// Push object to array
						columnObjects.push(columnObject);
					});
			}
			return columnObjects;
		}

		/**
		 * Finds the rowObject for the parent <tr> of the specified button
		 * 
		 * @param button The button for which the rowObject is to be found out
		 * @returns rowObject for the specified button
		 */
		function rowObjectForButton(button) {
			// Get the row element
			var rowElement = $(button).closest('tr');

			// Find the row object
			var rowObject = undefined;
			var result = $.grep(rowObjects, function(obj) {
				return obj.domElement === rowElement[0];
			});
			if (result.length == 1)
				rowObject = result[0];
			return rowObject;
		}

		// Return reference to caller to allow chaining
		return this;
	}
}(jQuery));
