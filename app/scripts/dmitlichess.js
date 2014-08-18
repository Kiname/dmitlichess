'use strict';

// @TODO: Options/config:
//          - Sound level
//          - Frenquency of misc/yes/long
// @TODO: Game start sounds

// Misc: every 15 seconds, yes: every 13 seconds, long: one time before 25 minutes
var config = {
  miscIntervalValue: 15000,
  yesIntervalValue: 13000,
  longTimeoutValue: (Math.floor(Math.random() * 1500) + 1) * 1000
};

var miscInterval, yesInterval, longTimeout;

var audioQueue = [];
var soundsPlayed = 0;

var makeAudio = function(file, volume) {
  var audio = new Audio(chrome.extension.getURL('ogg/' + file));
  audio.volume = volume;

  return audio;
};

var getRandomSound = function(key) {
  var files = sounds[key];

  return files && files[Math.floor(Math.random()*files.length)];
};

var getGenericSound = function(key) {
  // Generic capture sounds
  if (key.indexOf('x') === 1) { return getRandomSound(key.substring(1)); }

  // Translate some game end states
  // @TODO: Individual sounds for white/black resigned?
  if (key.indexOf('white resigned') >= 0) { return getRandomSound('resign'); }
  if (key.indexOf('black resigned') >= 0) { return getRandomSound('resign'); }
  if (key.indexOf('time out') >= 0) { return getRandomSound('flag'); }
};

var playNextSound = function() {
  if (audioQueue.length > 0) {
    audioQueue[0].play();
  }
};

var resetMiscInterval = function() {
  if (!miscInterval) { return; }

  clearInterval(miscInterval);
  miscInterval = setInterval(queueSound('misc'), config.miscIntervalValue);
};

var queueSound = function(key, notAuto) {
  var file = getRandomSound(key) || getGenericSound(key);
  var audio;

  var trueFiveOutOfSix = function() {
    return !!(Math.floor(Math.random() * 6));
  };

  var playNext = function() {
    audioQueue.shift();
    playNextSound();
  };

  var resetQueue = function() {
    audioQueue = [];
    resetMiscInterval();
  };

  var doEnded = function() {
    // Clear the queue if there are too many sounds queued
    // so Dmitry is not too behind the game with his commentary?
    if (audioQueue.length > 3) {
      resetQueue();
    } else {
      playNext();
    }
  };

  console.log(key, file);

  // No sound for notation :(
  if (!file) {
    // Random chance (1/6) to play a 'yes' sound instead of nothing
    // when the sound doesn't exist
    if (trueFiveOutOfSix()) { return; }
    file = getRandomSound('yes');
  }

  audio = makeAudio(file, 1);
  audio.addEventListener('ended', doEnded, false);

  audioQueue.push(audio);

  if (audioQueue.length === 1) { playNextSound(); }
};

var unleashDmitry = function(elTrigger) {
  // Attach event handlers
  elTrigger.on({
    'move capture': function(event, notation) { queueSound(notation); },
    'check': function(event) { queueSound('check'); },
    'state': function(event, state) {
      console.log('Game Over', state);

      queueSound(state);

      if (miscInterval) { clearInterval(miscInterval); }
      if (yesInterval) { clearInterval(yesInterval); }
      if (longTimeout) { clearTimeout(longTimeout); }
    }
  });

  // Play random sound bits
  // @TODO: Add an interval for Super GM names shoutouts (Levon Aronian, Magnus Carrrlsen, yessss)
  yesInterval = setInterval(function() { queueSound('yes'); }, config.yesIntervalValue);
  miscInterval = setInterval(function() { queueSound('misc'); }, config.miscIntervalValue);
  longTimeout = setTimeout(function() { queueSound('long'); }, config.longTimeoutValue);
};

var init = function() {
  var moveEmitter, checkEmitter, gameStateEmitter;

  if (!sounds) { return; }
  if (!lichess.elBoard) { return; }

  moveEmitter = new MoveEmitter(lichess.elBoard, lichess.$el);
  checkEmitter = new CheckEmitter(lichess.elBoard, lichess.$el);
  gameStateEmitter = new GameStateEmitter(lichess.elTable, lichess.$el);

  unleashDmitry(lichess.$el);
};

init();
