console.log('starting...');
$('#clock').FlipClock(Math.round((new Date('2017-06-26').getTime() - new Date().getTime()) / 1000), {
    clockFace: 'DailyCounter',
    countdown: true
});