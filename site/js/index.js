$('#clock').FlipClock(Math.round((new Date('2017-06-26 01:00:00').getTime() - new Date().getTime()) / 1000), {
    clockFace: 'DailyCounter',
    countdown: true
});

$('.gmaps-overlay').click(() => {
    $('.gmaps-overlay iframe').css("pointer-events", "auto");
});

$('.gmaps-overlay').mouseleave(() => {
    $('.gmaps-overlay iframe').css("pointer-events", "none");
});