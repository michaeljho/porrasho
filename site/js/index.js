$('#clock').FlipClock(Math.round((new Date('2017-06-26T00:00:00').getTime() - new Date().getTime()) / 1000) + (new Date().getTimezoneOffset() * 60), {
    clockFace: 'DailyCounter',
    countdown: true
});

$('.gmaps-overlay').click(() => {
    $('.gmaps-overlay iframe').css("pointer-events", "auto");
});

$('.gmaps-overlay').mouseleave(() => {
    $('.gmaps-overlay iframe').css("pointer-events", "none");
});

function getFormData($form){
    var unindexed_array = $form.serializeArray();
    var indexed_array = {};

    $.map(unindexed_array, function(n, i){
        indexed_array[n['name']] = n['value'];
    });

    return indexed_array;
}

$('input[name="other_name"]').keypress(() => {
    $('input[name="name"][value="other"]').prop('checked', true);
});

$('#rsvp-submit').click((e) => {
    e.preventDefault();
    const form = $('#shower-rsvp');
    const data = getFormData(form);
    let error = false;

    if (!data.email.trim().length || data.email.indexOf('@') === -1) {
        error = 'please enter a valid email address';
    }

    if (!data.name.trim().length) {
        error = 'please enter a valid name';
    }

    if (error) {
        form.siblings('.error-box').html(error);
        return;
    } else {
        form.siblings('.error-box').html('');
    }

    $.ajax('/rsvp', {
        method: 'POST',
        data: data,
        success: () => {
            form.find('button.btn').html('submitted!').addClass('disabled');
        }
    });
});

$('#names-submit').click((e) => {
    e.preventDefault();
    const form = $('#baby-names');
    const data = getFormData(form);
    const success = form.find('button.btn').siblings('.success-text');
    let error = false;
    success.html('');

    if (!data.name || (data.name === 'other' && !data.other_name.trim().length)) {
        error = 'please pick a name';
    }

    if (error) {
        form.siblings('.error-box').html(error);
        return;
    } else {
        form.siblings('.error-box').html('');
    }

    $.ajax('/names', {
        method: 'POST',
        data: data,
        success: () => {
            $('input[name="name"][value="calvin"]').prop('checked', true).prop('checked', false);
            $('input[name="other_name"]').val('');
            success.html('got it! feel free to submit another!');
        }
    });
});