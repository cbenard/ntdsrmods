(function ( $ ) {
 
    $.fn.forcenumeric = function(allowDecimal) {
        this.filter('input')
            .keypress(function(evt) {
                if (evt.which !== 13 && (!allowDecimal || evt.which !== 46) &&
                    evt.which > 31 && (evt.which < 48 || evt.which > 57)) {
                    evt.preventDefault();
                }
            })
            .keyup(function(evt) {
                if (/\D/.test($(this).val())) {
                    if (!allowDecimal) {
                        $(this).val($(this).val().replace(/\D/g, ''));
                    }
                    else {
                        $(this).val($(this).val().replace(/\D\./g, ''));
                    }
                }
            });
        return this;
    };
 
}( jQuery ));