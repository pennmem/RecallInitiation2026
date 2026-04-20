function runExperiment() {
  var prolific_pid = jsPsych.data.getURLVariable("PROLIFIC_PID");
  var study_id = jsPsych.data.getURLVariable("STUDY_ID");
  var session_id = jsPsych.data.getURLVariable("SESSION_ID");

  var COMPLETION_CODE = "C1ANMBFT";
  var PROLIFIC_COMPLETE_URL =
    "https://app.prolific.com/submissions/complete?cc=" + COMPLETION_CODE;

  function saveData() {
    return fetch("/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prolific_pid: prolific_pid,
        study_id: study_id,
        session_id: session_id,
        experiment: "dirFR2", // <- add
        table_name: "dirfr", // <- add
        data: jsPsych.data.get().values(),
      }),
    });
  }

  var initiation_conditions = ["primacy", "recency"];
  var initiation_condition = jsPsych.randomization.sampleWithoutReplacement(
    initiation_conditions,
    1,
  )[0];

  var timeline = [];

  var list_length = 20;
  var presentation_rate = 1000;

  // hold wheter keys are down
  var a_down = false;
  var l_down = false;
  // total replayed words -- if really high, exclude data
  var tot_replays = 0;

  // listen for pressing 'a' or 'l' keys down
  window.addEventListener("keydown", (e) => {
    var name = e.key;
    if (name == "a") {
      a_down = true;
    } else if (name == "l") {
      l_down = true;
    }
  });

  // listen for 'a' and 'l' keys being released
  window.addEventListener("keyup", (e) => {
    var name = e.key;
    if (name == "a") {
      a_down = false;
    } else if (name == "l") {
      l_down = false;
    }
  });

  var fullscreen = {
    type: "fullscreen",
    fullscreen_mode: true,
  };
  timeline.push(fullscreen);

  // Mike/Ricardo message
  var message = {
    type: "html-button-response",
    stimulus:
      "<p style = 'text-align:left;'>Dear Participant,<br>\
        The study you are about to begin will provide scientific data on how people learn and \
        remember information. It is very important that you pay attention throughout the task and follow \
        the instructions to the best of your ability. If you take notes, or otherwise disrupt the quality \
        of the data, then we will have to discard it, and you will not be invited to future experiments \
        produced by our laboratory. By analyzing your results, we will know whether you have provided us with valid \
        data, and this may impact your compensation at the end of the experiment, as well as your ability to participate \
        in our lab's future experiments. We ask that you find a quiet room where you can perform this task without \
        any interruptions. If you are willing and able to fulfill the requirements of this study as explained, click \
        the word 'Blue' below. Your data will be of great value to the scientific community and we thank you for your participation.<br>\
        Sincerely,<br>\
        <i>Michael J. Kahana, Ph.D.</i><br>\
        Director of the Computational Memory Lab</p>",
    choices: ["Blue", "Orange"],
    on_finish: function (data) {
      var resp = data.response;
      if (resp == 0) {
        data.color = "Blue"; // correct answer
      } else {
        data.color = "Orange"; // wrong answer
      }
    },
  };
  timeline.push(message);

  let fail_message = {
    type: "html-keyboard-response",
    response_ends_trial: false,
    stimulus:
      "<p>The preceding page was designed to screen participants who are not carefully paying attention.</p> \
        <p>Please do not reload the page.</p> \
        <p>Based on your responses to these questions, we ask that you return this HIT to Prolific at this time.</p>",
    choices: jsPsych.NO_KEYS,
    trial_duration: 3000,
    on_finish: function () {
      jsPsych.endExperiment("Please return this study to Prolific.");
    },
  };

  // check if correctly responded to message
  let message_node = {
    timeline: [fail_message],
    conditional_function: function () {
      // get the data from the previous trial,
      // and check which key was pressed
      var data = jsPsych.data.get().last(1).values()[0];
      if (data.response == 1) {
        return true;
      } else {
        return false;
      }
    },
  };
  timeline.push(message_node);

  // place lab's attention test here
  // includes timeout for people who don't answer correctly
  var lab_attention_check = jsPsychUtils.get_attention_check();
  timeline.push(lab_attention_check);

  //welcome page... something done from separate file called to by psiturk?
  var welcome = {
    type: "html-keyboard-response",
    stimulus:
      "<p>Welcome to the experiment.</p><p>Press any key to continue to the instructions.</p>",
  };
  timeline.push(welcome);

  //instructions page
  var instructions = {
    type: "instructions",
    pages: [
      "<p>Congratulations! Based on your performance in our previous round of data collection \
            you have qualified for part 2 of our experiment.</p> \
            <p>Thank you for your attention and effort in part 1.</p> \
            <p>The next page will give you a refresher on how the experiment will run.</p>",
      "<p>In this experiment you will be presented with a list of words, which you will hear one after another.</p> \
            <p>Then, there will be a 90 second recall period where you will be asked to recall the words from the list \
            by typing them into the recall box. You may be asked to recall them in a particular order.</p><p>This process of hearing a list of words and \
            then recalling those words will repeat for 12 lists, all of different words.</p><p>Remember to recall words from \
            the immediately preceeding list during each recall period.</p>",
      "<p>Please do NOT write down words, as this experiment is trying to study human memory!</p> \
            <p>Also, please do give your full attention and best effort to recall as many words as you can.</p> \
            <p>Again, honest performance on this task will qualify you for up to 2 more further, more lucrative \
            follow up sessions.</p>",
      "<p>Thank you!</p><p>Press Next to continue to the audio test.</p>",
    ],
    show_clickable_nav: true,
  };
  timeline.push(instructions);

  var sound_tone = {
    type: "audio-keyboard-response",
    stimulus: "audio/400Hz.wav",
    trial_duration: 500,
    choices: jsPsych.NO_KEYS,
    post_trial_gap: 1000,
  };

  var trial_audio = {
    type: "audio-keyboard-response",
    stimulus: "audio/wordpool/AudioTest/Test2.wav",
    choices: ["r", "c"],
    prompt:
      "<p>Adjust your volume so you can clearly hear the audio.</p> \
        <p> This is important so that you can hear the words presented that you will be asked to recall.</p> \
        <p>Press R to replay the audio so that you can adjust your volume, or press C once the sound level is good \
        to continue with the experiment.</p>",
  };

  var audio_test = {
    timeline: [trial_audio],
    loop_function: function (data) {
      if (data.values()[0].response == "r") {
        return true;
      } else if (data.values()[0].response == "c") {
        return false;
      }
    },
  };
  timeline.push(audio_test);

  //wordpool: at the moment, 554 words, commonness/similarity not taken into account
  var wordpool = [
    { audio: "audio/wordpool/ACTOR.wav", word: "Actor" },
    { audio: "audio/wordpool/ACTRESS.wav", word: "Actress" },
    { audio: "audio/wordpool/AGENT.wav", word: "Agent" },
    { audio: "audio/wordpool/AIRPLANE.wav", word: "Airplane" },
    { audio: "audio/wordpool/AIRPORT.wav", word: "Airport" },
    { audio: "audio/wordpool/ANKLE.wav", word: "Ankle" },
    { audio: "audio/wordpool/ANTLER.wav", word: "Antler" },
    { audio: "audio/wordpool/APPLE.wav", word: "Apple" },
    { audio: "audio/wordpool/APRON.wav", word: "Apron" },
    { audio: "audio/wordpool/ARM.wav", word: "Arm" },
    { audio: "audio/wordpool/ARMY.wav", word: "Army" },
    { audio: "audio/wordpool/ASIA.wav", word: "Asia" },
    { audio: "audio/wordpool/ATLAS.wav", word: "Atlas" },
    { audio: "audio/wordpool/ATOM.wav", word: "Atom" },
    { audio: "audio/wordpool/AUTHOR.wav", word: "Author" },
    { audio: "audio/wordpool/AWARD.wav", word: "Award" },
    { audio: "audio/wordpool/BABY.wav", word: "Baby" },
    { audio: "audio/wordpool/BACKBONE.wav", word: "Backbone" },
    { audio: "audio/wordpool/BACON.wav", word: "Bacon" },
    { audio: "audio/wordpool/BADGE.wav", word: "Badge" },
    { audio: "audio/wordpool/BALLOON.wav", word: "Balloon" },
    { audio: "audio/wordpool/BANJO.wav", word: "Banjo" },
    { audio: "audio/wordpool/BANK.wav", word: "Bank" },
    { audio: "audio/wordpool/BANKER.wav", word: "Banker" },
    { audio: "audio/wordpool/BANQUET.wav", word: "Banquet" },
    { audio: "audio/wordpool/BARLEY.wav", word: "Barley" },
    { audio: "audio/wordpool/BARREL.wav", word: "Barrel" },
    { audio: "audio/wordpool/BASEMENT.wav", word: "Basement" },
    { audio: "audio/wordpool/BATHTUB.wav", word: "Bathtub" },
    { audio: "audio/wordpool/BEAKER.wav", word: "Beaker" },
    { audio: "audio/wordpool/BEAST.wav", word: "Beast" },
    { audio: "audio/wordpool/BEAVER.wav", word: "Beaver" },
    { audio: "audio/wordpool/BEEF.wav", word: "Beef" },
    { audio: "audio/wordpool/BELLY.wav", word: "Belly" },
    { audio: "audio/wordpool/BIKE.wav", word: "Bike" },
    { audio: "audio/wordpool/BINDER.wav", word: "Binder" },
    { audio: "audio/wordpool/BISON.wav", word: "Bison" },
    { audio: "audio/wordpool/BLACKBOARD.wav", word: "Blackboard" },
    { audio: "audio/wordpool/BLADE.wav", word: "Blade" },
    { audio: "audio/wordpool/BLENDER.wav", word: "Blender" },
    { audio: "audio/wordpool/BLOCKADE.wav", word: "Blockade" },
    { audio: "audio/wordpool/BLOUSE.wav", word: "Blouse" },
    { audio: "audio/wordpool/BLUEPRINT.wav", word: "Blueprint" },
    { audio: "audio/wordpool/BODY.wav", word: "Body" },
    { audio: "audio/wordpool/BOUQUET.wav", word: "Bouquet" },
    { audio: "audio/wordpool/BOX.wav", word: "Box" },
    { audio: "audio/wordpool/BOYFRIEND.wav", word: "Boyfriend" },
    { audio: "audio/wordpool/BRACES.wav", word: "Braces" },
    { audio: "audio/wordpool/BRANCH.wav", word: "Branch" },
    { audio: "audio/wordpool/BRANDY.wav", word: "Brandy" },
    { audio: "audio/wordpool/BREAST.wav", word: "Breast" },
    { audio: "audio/wordpool/BRICK.wav", word: "Brick" },
    { audio: "audio/wordpool/BRIEFCASE.wav", word: "Briefcase" },
    { audio: "audio/wordpool/BROOK.wav", word: "Brook" },
    { audio: "audio/wordpool/BROTHER.wav", word: "Brother" },
    { audio: "audio/wordpool/BUBBLE.wav", word: "Bubble" },
    { audio: "audio/wordpool/BUCKET.wav", word: "Bucket" },
    { audio: "audio/wordpool/BUG.wav", word: "Bug" },
    { audio: "audio/wordpool/BUGGY.wav", word: "Buggy" },
    { audio: "audio/wordpool/BULLET.wav", word: "Bullet" },
    { audio: "audio/wordpool/BUNNY.wav", word: "Bunny" },
    { audio: "audio/wordpool/BUREAU.wav", word: "Bureau" },
    { audio: "audio/wordpool/BURGLAR.wav", word: "Burglar" },
    { audio: "audio/wordpool/BUTCHER.wav", word: "Butcher" },
    { audio: "audio/wordpool/CABBAGE.wav", word: "Cabbage" },
    { audio: "audio/wordpool/CABIN.wav", word: "Cabin" },
    { audio: "audio/wordpool/CAFE.wav", word: "Cafe" },
    { audio: "audio/wordpool/CAMEL.wav", word: "Camel" },
    { audio: "audio/wordpool/CANAL.wav", word: "Canal" },
    { audio: "audio/wordpool/CANDY.wav", word: "Candy" },
    { audio: "audio/wordpool/CANYON.wav", word: "Canyon" },
    { audio: "audio/wordpool/CAPTIVE.wav", word: "Captive" },
    { audio: "audio/wordpool/CARRIAGE.wav", word: "Carriage" },
    { audio: "audio/wordpool/CARROT.wav", word: "Carrot" },
    { audio: "audio/wordpool/CASHEW.wav", word: "Cashew" },
    { audio: "audio/wordpool/CASHIER.wav", word: "Cashier" },
    { audio: "audio/wordpool/CASKET.wav", word: "Casket" },
    { audio: "audio/wordpool/CATCHER.wav", word: "Catcher" },
    { audio: "audio/wordpool/CATTLE.wav", word: "Cattle" },
    { audio: "audio/wordpool/CELLAR.wav", word: "Cellar" },
    { audio: "audio/wordpool/CHAMPAGNE.wav", word: "Champagne" },
    { audio: "audio/wordpool/CHAPEL.wav", word: "Chapel" },
    { audio: "audio/wordpool/CHAUFFEUR.wav", word: "Chauffeur" },
    { audio: "audio/wordpool/CHEMIST.wav", word: "Chemist" },
    { audio: "audio/wordpool/CHEST.wav", word: "Chest" },
    { audio: "audio/wordpool/CHILD.wav", word: "Child" },
    { audio: "audio/wordpool/CHIPMUNK.wav", word: "Chipmunk" },
    { audio: "audio/wordpool/CHURCH.wav", word: "Church" },
    { audio: "audio/wordpool/CIGAR.wav", word: "Cigar" },
    { audio: "audio/wordpool/CITRUS.wav", word: "Citrus" },
    { audio: "audio/wordpool/CLAM.wav", word: "Clam" },
    { audio: "audio/wordpool/CLAMP.wav", word: "Clamp" },
    { audio: "audio/wordpool/CLIMBER.wav", word: "Climber" },
    { audio: "audio/wordpool/CLOCK.wav", word: "Clock" },
    { audio: "audio/wordpool/CLOTHES.wav", word: "Clothes" },
    { audio: "audio/wordpool/CLOUD.wav", word: "Cloud" },
    { audio: "audio/wordpool/COBRA.wav", word: "Cobra" },
    { audio: "audio/wordpool/COCKTAIL.wav", word: "Cocktail" },
    { audio: "audio/wordpool/COCOON.wav", word: "Cocoon" },
    { audio: "audio/wordpool/COD.wav", word: "Cod" },
    { audio: "audio/wordpool/COFFEE.wav", word: "Coffee" },
    { audio: "audio/wordpool/COIN.wav", word: "Coin" },
    { audio: "audio/wordpool/COLLEGE.wav", word: "College" },
    { audio: "audio/wordpool/COMET.wav", word: "Comet" },
    { audio: "audio/wordpool/COMPASS.wav", word: "Compass" },
    { audio: "audio/wordpool/CONCERT.wav", word: "Concert" },
    { audio: "audio/wordpool/CONTRACT.wav", word: "Contract" },
    { audio: "audio/wordpool/CONVICT.wav", word: "Convict" },
    { audio: "audio/wordpool/COOK.wav", word: "Cook" },
    { audio: "audio/wordpool/COOKBOOK.wav", word: "Cookbook" },
    { audio: "audio/wordpool/COSTUME.wav", word: "Costume" },
    { audio: "audio/wordpool/COTTAGE.wav", word: "Cottage" },
    { audio: "audio/wordpool/COUCH.wav", word: "Couch" },
    { audio: "audio/wordpool/COUNTRY.wav", word: "Country" },
    { audio: "audio/wordpool/COUNTY.wav", word: "County" },
    { audio: "audio/wordpool/COUSIN.wav", word: "Cousin" },
    { audio: "audio/wordpool/COWBOY.wav", word: "Cowboy" },
    { audio: "audio/wordpool/CRAB.wav", word: "Crab" },
    { audio: "audio/wordpool/CRATER.wav", word: "Crater" },
    { audio: "audio/wordpool/CRAYON.wav", word: "Crayon" },
    { audio: "audio/wordpool/CREATURE.wav", word: "Creature" },
    { audio: "audio/wordpool/CREVICE.wav", word: "Crevice" },
    { audio: "audio/wordpool/CRIB.wav", word: "Crib" },
    { audio: "audio/wordpool/CRICKET.wav", word: "Cricket" },
    { audio: "audio/wordpool/CRITIC.wav", word: "Critic" },
    { audio: "audio/wordpool/CROSS.wav", word: "Cross" },
    { audio: "audio/wordpool/CROWN.wav", word: "Crown" },
    { audio: "audio/wordpool/CRUTCH.wav", word: "Crutch" },
    { audio: "audio/wordpool/CUPBOARD.wav", word: "Cupboard" },
    { audio: "audio/wordpool/CURTAIN.wav", word: "Curtain" },
    { audio: "audio/wordpool/CUSTARD.wav", word: "Custard" },
    { audio: "audio/wordpool/CYCLONE.wav", word: "Cyclone" },
    { audio: "audio/wordpool/DAISY.wav", word: "Daisy" },
    { audio: "audio/wordpool/DANCER.wav", word: "Dancer" },
    { audio: "audio/wordpool/DANDRUFF.wav", word: "Dandruff" },
    { audio: "audio/wordpool/DASHBOARD.wav", word: "Dashboard" },
    { audio: "audio/wordpool/DAUGHTER.wav", word: "Daughter" },
    { audio: "audio/wordpool/DENIM.wav", word: "Denim" },
    { audio: "audio/wordpool/DENTIST.wav", word: "Dentist" },
    { audio: "audio/wordpool/DIME.wav", word: "Dime" },
    { audio: "audio/wordpool/DINER.wav", word: "Diner" },
    { audio: "audio/wordpool/DIVER.wav", word: "Diver" },
    { audio: "audio/wordpool/DOLPHIN.wav", word: "Dolphin" },
    { audio: "audio/wordpool/DONKEY.wav", word: "Donkey" },
    { audio: "audio/wordpool/DONOR.wav", word: "Donor" },
    { audio: "audio/wordpool/DORM.wav", word: "Dorm" },
    { audio: "audio/wordpool/DOUGHNUT.wav", word: "Doughnut" },
    { audio: "audio/wordpool/DRAGON.wav", word: "Dragon" },
    { audio: "audio/wordpool/DRAWING.wav", word: "Drawing" },
    { audio: "audio/wordpool/DRESS.wav", word: "Dress" },
    { audio: "audio/wordpool/DRESSER.wav", word: "Dresser" },
    { audio: "audio/wordpool/DRILL.wav", word: "Drill" },
    { audio: "audio/wordpool/DRINK.wav", word: "Drink" },
    { audio: "audio/wordpool/DRIVER.wav", word: "Driver" },
    { audio: "audio/wordpool/DRUG.wav", word: "Drug" },
    { audio: "audio/wordpool/DUST.wav", word: "Dust" },
    { audio: "audio/wordpool/DUSTPAN.wav", word: "Dustpan" },
    { audio: "audio/wordpool/EAGLE.wav", word: "Eagle" },
    { audio: "audio/wordpool/EGYPT.wav", word: "Egypt" },
    { audio: "audio/wordpool/ELBOW.wav", word: "Elbow" },
    { audio: "audio/wordpool/EMPIRE.wav", word: "Empire" },
    { audio: "audio/wordpool/EUROPE.wav", word: "Europe" },
    { audio: "audio/wordpool/EXPERT.wav", word: "Expert" },
    { audio: "audio/wordpool/EYELASH.wav", word: "Eyelash" },
    { audio: "audio/wordpool/FARMER.wav", word: "Farmer" },
    { audio: "audio/wordpool/FEMALE.wav", word: "Female" },
    { audio: "audio/wordpool/FIDDLE.wav", word: "Fiddle" },
    { audio: "audio/wordpool/FILM.wav", word: "Film" },
    { audio: "audio/wordpool/FINGER.wav", word: "Finger" },
    { audio: "audio/wordpool/FIREMAN.wav", word: "Fireman" },
    { audio: "audio/wordpool/FIREPLACE.wav", word: "Fireplace" },
    { audio: "audio/wordpool/FLAG.wav", word: "Flag" },
    { audio: "audio/wordpool/FLASHLIGHT.wav", word: "Flashlight" },
    { audio: "audio/wordpool/FLASK.wav", word: "Flask" },
    { audio: "audio/wordpool/FLEET.wav", word: "Fleet" },
    { audio: "audio/wordpool/FLESH.wav", word: "Flesh" },
    { audio: "audio/wordpool/FLIPPER.wav", word: "Flipper" },
    { audio: "audio/wordpool/FLOWER.wav", word: "Flower" },
    { audio: "audio/wordpool/FLUTE.wav", word: "Flute" },
    { audio: "audio/wordpool/FOOT.wav", word: "Foot" },
    { audio: "audio/wordpool/FOOTBALL.wav", word: "Football" },
    { audio: "audio/wordpool/FOREHEAD.wav", word: "Forehead" },
    { audio: "audio/wordpool/FOREST.wav", word: "Forest" },
    { audio: "audio/wordpool/FOX.wav", word: "Fox" },
    { audio: "audio/wordpool/FRAGRANCE.wav", word: "Fragrance" },
    { audio: "audio/wordpool/FRAME.wav", word: "Frame" },
    { audio: "audio/wordpool/FRANCE.wav", word: "France" },
    { audio: "audio/wordpool/FRECKLE.wav", word: "Freckle" },
    { audio: "audio/wordpool/FREEZER.wav", word: "Freezer" },
    { audio: "audio/wordpool/FRIEND.wav", word: "Friend" },
    { audio: "audio/wordpool/FRUIT.wav", word: "Fruit" },
    { audio: "audio/wordpool/FUNGUS.wav", word: "Fungus" },
    { audio: "audio/wordpool/GALLON.wav", word: "Gallon" },
    { audio: "audio/wordpool/GANGSTER.wav", word: "Gangster" },
    { audio: "audio/wordpool/GARBAGE.wav", word: "Garbage" },
    { audio: "audio/wordpool/GARDEN.wav", word: "Garden" },
    { audio: "audio/wordpool/GARLIC.wav", word: "Garlic" },
    { audio: "audio/wordpool/GAVEL.wav", word: "Gavel" },
    { audio: "audio/wordpool/GAZELLE.wav", word: "Gazelle" },
    { audio: "audio/wordpool/GHETTO.wav", word: "Ghetto" },
    { audio: "audio/wordpool/GIFT.wav", word: "Gift" },
    { audio: "audio/wordpool/GIRL.wav", word: "Girl" },
    { audio: "audio/wordpool/GLASS.wav", word: "Glass" },
    { audio: "audio/wordpool/GLOBE.wav", word: "Globe" },
    { audio: "audio/wordpool/GLOVE.wav", word: "Glove" },
    { audio: "audio/wordpool/GOBLIN.wav", word: "Goblin" },
    { audio: "audio/wordpool/GRAPE.wav", word: "Grape" },
    { audio: "audio/wordpool/GRAVE.wav", word: "Grave" },
    { audio: "audio/wordpool/GRAVEL.wav", word: "Gravel" },
    { audio: "audio/wordpool/GRILL.wav", word: "Grill" },
    { audio: "audio/wordpool/GROUND.wav", word: "Ground" },
    { audio: "audio/wordpool/GUARD.wav", word: "Guard" },
    { audio: "audio/wordpool/GUITAR.wav", word: "Guitar" },
    { audio: "audio/wordpool/GYMNAST.wav", word: "Gymnast" },
    { audio: "audio/wordpool/HAMPER.wav", word: "Hamper" },
    { audio: "audio/wordpool/HAND.wav", word: "Hand" },
    { audio: "audio/wordpool/HANDBAG.wav", word: "Handbag" },
    { audio: "audio/wordpool/HARP.wav", word: "Harp" },
    { audio: "audio/wordpool/HATCHET.wav", word: "Hatchet" },
    { audio: "audio/wordpool/HAWK.wav", word: "Hawk" },
    { audio: "audio/wordpool/HEADBAND.wav", word: "Headband" },
    { audio: "audio/wordpool/HEART.wav", word: "Heart" },
    { audio: "audio/wordpool/HEDGE.wav", word: "Hedge" },
    { audio: "audio/wordpool/HELMET.wav", word: "Helmet" },
    { audio: "audio/wordpool/HERO.wav", word: "Hero" },
    { audio: "audio/wordpool/HIGHWAY.wav", word: "Highway" },
    { audio: "audio/wordpool/HIKER.wav", word: "Hiker" },
    { audio: "audio/wordpool/HONEY.wav", word: "Honey" },
    { audio: "audio/wordpool/HOOD.wav", word: "Hood" },
    { audio: "audio/wordpool/HOOK.wav", word: "Hook" },
    { audio: "audio/wordpool/HORNET.wav", word: "Hornet" },
    { audio: "audio/wordpool/HOSTESS.wav", word: "Hostess" },
    { audio: "audio/wordpool/HOUND.wav", word: "Hound" },
    { audio: "audio/wordpool/HUMAN.wav", word: "Human" },
    { audio: "audio/wordpool/HUSBAND.wav", word: "Husband" },
    { audio: "audio/wordpool/ICEBERG.wav", word: "Iceberg" },
    { audio: "audio/wordpool/ICING.wav", word: "Icing" },
    { audio: "audio/wordpool/IGLOO.wav", word: "Igloo" },
    { audio: "audio/wordpool/INFANT.wav", word: "Infant" },
    { audio: "audio/wordpool/INMATE.wav", word: "Inmate" },
    { audio: "audio/wordpool/ISLAND.wav", word: "Island" },
    { audio: "audio/wordpool/ITEM.wav", word: "Item" },
    { audio: "audio/wordpool/JAPAN.wav", word: "Japan" },
    { audio: "audio/wordpool/JELLO.wav", word: "Jello" },
    { audio: "audio/wordpool/JELLY.wav", word: "Jelly" },
    { audio: "audio/wordpool/JOURNAL.wav", word: "Journal" },
    { audio: "audio/wordpool/JUDGE.wav", word: "Judge" },
    { audio: "audio/wordpool/JUGGLER.wav", word: "Juggler" },
    { audio: "audio/wordpool/JUNGLE.wav", word: "Jungle" },
    { audio: "audio/wordpool/JURY.wav", word: "Jury" },
    { audio: "audio/wordpool/KEEPER.wav", word: "Keeper" },
    { audio: "audio/wordpool/KETCHUP.wav", word: "Ketchup" },
    { audio: "audio/wordpool/KIDNEY.wav", word: "Kidney" },
    { audio: "audio/wordpool/KITCHEN.wav", word: "Kitchen" },
    { audio: "audio/wordpool/KLEENEX.wav", word: "Kleenex" },
    { audio: "audio/wordpool/KNAPSACK.wav", word: "Knapsack" },
    { audio: "audio/wordpool/KNIFE.wav", word: "Knife" },
    { audio: "audio/wordpool/LABEL.wav", word: "Label" },
    { audio: "audio/wordpool/LACE.wav", word: "Lace" },
    { audio: "audio/wordpool/LADY.wav", word: "Lady" },
    { audio: "audio/wordpool/LAGOON.wav", word: "Lagoon" },
    { audio: "audio/wordpool/LAKE.wav", word: "Lake" },
    { audio: "audio/wordpool/LAMP.wav", word: "Lamp" },
    { audio: "audio/wordpool/LAPEL.wav", word: "Lapel" },
    { audio: "audio/wordpool/LASER.wav", word: "Laser" },
    { audio: "audio/wordpool/LAVA.wav", word: "Lava" },
    { audio: "audio/wordpool/LEADER.wav", word: "Leader" },
    { audio: "audio/wordpool/LEG.wav", word: "Leg" },
    { audio: "audio/wordpool/LEOPARD.wav", word: "Leopard" },
    { audio: "audio/wordpool/LETTUCE.wav", word: "Lettuce" },
    { audio: "audio/wordpool/LIGHTNING.wav", word: "Lightning" },
    { audio: "audio/wordpool/LILY.wav", word: "Lily" },
    { audio: "audio/wordpool/LION.wav", word: "Lion" },
    { audio: "audio/wordpool/LIPSTICK.wav", word: "Lipstick" },
    { audio: "audio/wordpool/LIVER.wav", word: "Liver" },
    { audio: "audio/wordpool/LIZARD.wav", word: "Lizard" },
    { audio: "audio/wordpool/LODGE.wav", word: "Lodge" },
    { audio: "audio/wordpool/LOFT.wav", word: "Loft" },
    { audio: "audio/wordpool/LONDON.wav", word: "London" },
    { audio: "audio/wordpool/LOVER.wav", word: "Lover" },
    { audio: "audio/wordpool/LUGGAGE.wav", word: "Luggage" },
    { audio: "audio/wordpool/LUMBER.wav", word: "Lumber" },
    { audio: "audio/wordpool/LUNCH.wav", word: "Lunch" },
    { audio: "audio/wordpool/MACHINE.wav", word: "Machine" },
    { audio: "audio/wordpool/MAILBOX.wav", word: "Mailbox" },
    { audio: "audio/wordpool/MAILMAN.wav", word: "Mailman" },
    { audio: "audio/wordpool/MAMMAL.wav", word: "Mammal" },
    { audio: "audio/wordpool/MAPLE.wav", word: "Maple" },
    { audio: "audio/wordpool/MARINE.wav", word: "Marine" },
    { audio: "audio/wordpool/MARKER.wav", word: "Marker" },
    { audio: "audio/wordpool/MARKET.wav", word: "Market" },
    { audio: "audio/wordpool/MARROW.wav", word: "Marrow" },
    { audio: "audio/wordpool/MARS.wav", word: "Mars" },
    { audio: "audio/wordpool/MARSH.wav", word: "Marsh" },
    { audio: "audio/wordpool/MASK.wav", word: "Mask" },
    { audio: "audio/wordpool/MATCH.wav", word: "Match" },
    { audio: "audio/wordpool/MATTRESS.wav", word: "Mattress" },
    { audio: "audio/wordpool/MESSAGE.wav", word: "Message" },
    { audio: "audio/wordpool/MILDEW.wav", word: "Mildew" },
    { audio: "audio/wordpool/MILK.wav", word: "Milk" },
    { audio: "audio/wordpool/MISSILE.wav", word: "Missile" },
    { audio: "audio/wordpool/MISTER.wav", word: "Mister" },
    { audio: "audio/wordpool/MONEY.wav", word: "Money" },
    { audio: "audio/wordpool/MONSTER.wav", word: "Monster" },
    { audio: "audio/wordpool/MOP.wav", word: "Mop" },
    { audio: "audio/wordpool/MOTEL.wav", word: "Motel" },
    { audio: "audio/wordpool/MOTOR.wav", word: "Motor" },
    { audio: "audio/wordpool/MUFFIN.wav", word: "Muffin" },
    { audio: "audio/wordpool/MUMMY.wav", word: "Mummy" },
    { audio: "audio/wordpool/MUSTARD.wav", word: "Mustard" },
    { audio: "audio/wordpool/NAPKIN.wav", word: "Napkin" },
    { audio: "audio/wordpool/NECKLACE.wav", word: "Necklace" },
    { audio: "audio/wordpool/NEUTRON.wav", word: "Neutron" },
    { audio: "audio/wordpool/NIGHTGOWN.wav", word: "Nightgown" },
    { audio: "audio/wordpool/NOMAD.wav", word: "Nomad" },
    { audio: "audio/wordpool/NOTEBOOK.wav", word: "Notebook" },
    { audio: "audio/wordpool/NOVEL.wav", word: "Novel" },
    { audio: "audio/wordpool/NURSE.wav", word: "Nurse" },
    { audio: "audio/wordpool/OFFICE.wav", word: "Office" },
    { audio: "audio/wordpool/OINTMENT.wav", word: "Ointment" },
    { audio: "audio/wordpool/OMELET.wav", word: "Omelet" },
    { audio: "audio/wordpool/ONION.wav", word: "Onion" },
    { audio: "audio/wordpool/ORANGE.wav", word: "Orange" },
    { audio: "audio/wordpool/ORCHID.wav", word: "Orchid" },
    { audio: "audio/wordpool/OUTDOORS.wav", word: "Outdoors" },
    { audio: "audio/wordpool/OUTFIT.wav", word: "Outfit" },
    { audio: "audio/wordpool/OUTLAW.wav", word: "Outlaw" },
    { audio: "audio/wordpool/OX.wav", word: "Ox" },
    { audio: "audio/wordpool/OYSTER.wav", word: "Oyster" },
    { audio: "audio/wordpool/OZONE.wav", word: "Ozone" },
    { audio: "audio/wordpool/PACKAGE.wav", word: "Package" },
    { audio: "audio/wordpool/PADDING.wav", word: "Padding" },
    { audio: "audio/wordpool/PADDLE.wav", word: "Paddle" },
    { audio: "audio/wordpool/PALACE.wav", word: "Palace" },
    { audio: "audio/wordpool/PANTHER.wav", word: "Panther" },
    { audio: "audio/wordpool/PAPER.wav", word: "Paper" },
    { audio: "audio/wordpool/PARENT.wav", word: "Parent" },
    { audio: "audio/wordpool/PARROT.wav", word: "Parrot" },
    { audio: "audio/wordpool/PARSLEY.wav", word: "Parsley" },
    { audio: "audio/wordpool/PARTNER.wav", word: "Partner" },
    { audio: "audio/wordpool/PASSAGE.wav", word: "Passage" },
    { audio: "audio/wordpool/PASTA.wav", word: "Pasta" },
    { audio: "audio/wordpool/PASTRY.wav", word: "Pastry" },
    { audio: "audio/wordpool/PATIENT.wav", word: "Patient" },
    { audio: "audio/wordpool/PATROL.wav", word: "Patrol" },
    { audio: "audio/wordpool/PEACH.wav", word: "Peach" },
    { audio: "audio/wordpool/PEANUT.wav", word: "Peanut" },
    { audio: "audio/wordpool/PEBBLE.wav", word: "Pebble" },
    { audio: "audio/wordpool/PECAN.wav", word: "Pecan" },
    { audio: "audio/wordpool/PENGUIN.wav", word: "Penguin" },
    { audio: "audio/wordpool/PEPPER.wav", word: "Pepper" },
    { audio: "audio/wordpool/PERCH.wav", word: "Perch" },
    { audio: "audio/wordpool/PERFUME.wav", word: "Perfume" },
    { audio: "audio/wordpool/PERMIT.wav", word: "Permit" },
    { audio: "audio/wordpool/PIANO.wav", word: "Piano" },
    { audio: "audio/wordpool/PICNIC.wav", word: "Picnic" },
    { audio: "audio/wordpool/PICTURE.wav", word: "Picture" },
    { audio: "audio/wordpool/PIGEON.wav", word: "Pigeon" },
    { audio: "audio/wordpool/PIGMENT.wav", word: "Pigment" },
    { audio: "audio/wordpool/PILOT.wav", word: "Pilot" },
    { audio: "audio/wordpool/PIMPLE.wav", word: "Pimple" },
    { audio: "audio/wordpool/PISTOL.wav", word: "Pistol" },
    { audio: "audio/wordpool/PISTON.wav", word: "Piston" },
    { audio: "audio/wordpool/PIZZA.wav", word: "Pizza" },
    { audio: "audio/wordpool/PLAID.wav", word: "Plaid" },
    { audio: "audio/wordpool/PLASTER.wav", word: "Plaster" },
    { audio: "audio/wordpool/PLATE.wav", word: "Plate" },
    { audio: "audio/wordpool/PLAYGROUND.wav", word: "Playground" },
    { audio: "audio/wordpool/PLAZA.wav", word: "Plaza" },
    { audio: "audio/wordpool/PLIERS.wav", word: "Pliers" },
    { audio: "audio/wordpool/PLUTO.wav", word: "Pluto" },
    { audio: "audio/wordpool/POCKET.wav", word: "Pocket" },
    { audio: "audio/wordpool/POET.wav", word: "Poet" },
    { audio: "audio/wordpool/POISON.wav", word: "Poison" },
    { audio: "audio/wordpool/POLICE.wav", word: "Police" },
    { audio: "audio/wordpool/POPCORN.wav", word: "Popcorn" },
    { audio: "audio/wordpool/PORK.wav", word: "Pork" },
    { audio: "audio/wordpool/PORTRAIT.wav", word: "Portrait" },
    { audio: "audio/wordpool/POSSUM.wav", word: "Possum" },
    { audio: "audio/wordpool/POSTAGE.wav", word: "Postage" },
    { audio: "audio/wordpool/POWDER.wav", word: "Powder" },
    { audio: "audio/wordpool/PREACHER.wav", word: "Preacher" },
    { audio: "audio/wordpool/PRIMATE.wav", word: "Primate" },
    { audio: "audio/wordpool/PRINCESS.wav", word: "Princess" },
    { audio: "audio/wordpool/PROTON.wav", word: "Proton" },
    { audio: "audio/wordpool/PUDDING.wav", word: "Pudding" },
    { audio: "audio/wordpool/PUDDLE.wav", word: "Puddle" },
    { audio: "audio/wordpool/PUPPY.wav", word: "Puppy" },
    { audio: "audio/wordpool/QUAIL.wav", word: "Quail" },
    { audio: "audio/wordpool/QUARTER.wav", word: "Quarter" },
    { audio: "audio/wordpool/QUEEN.wav", word: "Queen" },
    { audio: "audio/wordpool/RABBIT.wav", word: "Rabbit" },
    { audio: "audio/wordpool/RACKET.wav", word: "Racket" },
    { audio: "audio/wordpool/RADISH.wav", word: "Radish" },
    { audio: "audio/wordpool/RAFT.wav", word: "Raft" },
    { audio: "audio/wordpool/RATTLE.wav", word: "Rattle" },
    { audio: "audio/wordpool/RAZOR.wav", word: "Razor" },
    { audio: "audio/wordpool/REBEL.wav", word: "Rebel" },
    { audio: "audio/wordpool/RECEIPT.wav", word: "Receipt" },
    { audio: "audio/wordpool/RECORD.wav", word: "Record" },
    { audio: "audio/wordpool/RELISH.wav", word: "Relish" },
    { audio: "audio/wordpool/REPORT.wav", word: "Report" },
    { audio: "audio/wordpool/RIFLE.wav", word: "Rifle" },
    { audio: "audio/wordpool/RIVER.wav", word: "River" },
    { audio: "audio/wordpool/ROBBER.wav", word: "Robber" },
    { audio: "audio/wordpool/ROBIN.wav", word: "Robin" },
    { audio: "audio/wordpool/ROBOT.wav", word: "Robot" },
    { audio: "audio/wordpool/ROCKET.wav", word: "Rocket" },
    { audio: "audio/wordpool/ROD.wav", word: "Rod" },
    { audio: "audio/wordpool/ROOSTER.wav", word: "Rooster" },
    { audio: "audio/wordpool/RUG.wav", word: "Rug" },
    { audio: "audio/wordpool/RUST.wav", word: "Rust" },
    { audio: "audio/wordpool/SADDLE.wav", word: "Saddle" },
    { audio: "audio/wordpool/SALAD.wav", word: "Salad" },
    { audio: "audio/wordpool/SALMON.wav", word: "Salmon" },
    { audio: "audio/wordpool/SALT.wav", word: "Salt" },
    { audio: "audio/wordpool/SANDWICH.wav", word: "Sandwich" },
    { audio: "audio/wordpool/SAUSAGE.wav", word: "Sausage" },
    { audio: "audio/wordpool/SCALLOP.wav", word: "Scallop" },
    { audio: "audio/wordpool/SCALPEL.wav", word: "Scalpel" },
    { audio: "audio/wordpool/SCARECROW.wav", word: "Scarecrow" },
    { audio: "audio/wordpool/SCARF.wav", word: "Scarf" },
    { audio: "audio/wordpool/SCISSORS.wav", word: "Scissors" },
    { audio: "audio/wordpool/SCOTCH.wav", word: "Scotch" },
    { audio: "audio/wordpool/SCRIBBLE.wav", word: "Scribble" },
    { audio: "audio/wordpool/SCULPTURE.wav", word: "Sculpture" },
    { audio: "audio/wordpool/SEAFOOD.wav", word: "Seafood" },
    { audio: "audio/wordpool/SEAGULL.wav", word: "Seagull" },
    { audio: "audio/wordpool/SEAL.wav", word: "Seal" },
    { audio: "audio/wordpool/SERVANT.wav", word: "Servant" },
    { audio: "audio/wordpool/SERVER.wav", word: "Server" },
    { audio: "audio/wordpool/SHARK.wav", word: "Shark" },
    { audio: "audio/wordpool/SHELF.wav", word: "Shelf" },
    { audio: "audio/wordpool/SHELTER.wav", word: "Shelter" },
    { audio: "audio/wordpool/SHERIFF.wav", word: "Sheriff" },
    { audio: "audio/wordpool/SHIRT.wav", word: "Shirt" },
    { audio: "audio/wordpool/SHORTCAKE.wav", word: "Shortcake" },
    { audio: "audio/wordpool/SHORTS.wav", word: "Shorts" },
    { audio: "audio/wordpool/SHOULDER.wav", word: "Shoulder" },
    { audio: "audio/wordpool/SHOVEL.wav", word: "Shovel" },
    { audio: "audio/wordpool/SHRUB.wav", word: "Shrub" },
    { audio: "audio/wordpool/SIBLING.wav", word: "Sibling" },
    { audio: "audio/wordpool/SIDEWALK.wav", word: "Sidewalk" },
    { audio: "audio/wordpool/SILK.wav", word: "Silk" },
    { audio: "audio/wordpool/SISTER.wav", word: "Sister" },
    { audio: "audio/wordpool/SKETCH.wav", word: "Sketch" },
    { audio: "audio/wordpool/SKILLET.wav", word: "Skillet" },
    { audio: "audio/wordpool/SKIRT.wav", word: "Skirt" },
    { audio: "audio/wordpool/SLIDE.wav", word: "Slide" },
    { audio: "audio/wordpool/SLIME.wav", word: "Slime" },
    { audio: "audio/wordpool/SLOPE.wav", word: "Slope" },
    { audio: "audio/wordpool/SLUG.wav", word: "Slug" },
    { audio: "audio/wordpool/SMOG.wav", word: "Smog" },
    { audio: "audio/wordpool/SNACK.wav", word: "Snack" },
    { audio: "audio/wordpool/SNAIL.wav", word: "Snail" },
    { audio: "audio/wordpool/SNAKE.wav", word: "Snake" },
    { audio: "audio/wordpool/SODA.wav", word: "Soda" },
    { audio: "audio/wordpool/SOFTBALL.wav", word: "Softball" },
    { audio: "audio/wordpool/SPACE.wav", word: "Space" },
    { audio: "audio/wordpool/SPARROW.wav", word: "Sparrow" },
    { audio: "audio/wordpool/SPHINX.wav", word: "Sphinx" },
    { audio: "audio/wordpool/SPIDER.wav", word: "Spider" },
    { audio: "audio/wordpool/SPONGE.wav", word: "Sponge" },
    { audio: "audio/wordpool/SPOOL.wav", word: "Spool" },
    { audio: "audio/wordpool/SPOON.wav", word: "Spoon" },
    { audio: "audio/wordpool/SPOUSE.wav", word: "Spouse" },
    { audio: "audio/wordpool/STALLION.wav", word: "Stallion" },
    { audio: "audio/wordpool/STAMP.wav", word: "Stamp" },
    { audio: "audio/wordpool/STAPLE.wav", word: "Staple" },
    { audio: "audio/wordpool/STAR.wav", word: "Star" },
    { audio: "audio/wordpool/STATUE.wav", word: "Statue" },
    { audio: "audio/wordpool/STICKER.wav", word: "Sticker" },
    { audio: "audio/wordpool/STOMACH.wav", word: "Stomach" },
    { audio: "audio/wordpool/STONE.wav", word: "Stone" },
    { audio: "audio/wordpool/STOVE.wav", word: "Stove" },
    { audio: "audio/wordpool/STREAM.wav", word: "Stream" },
    { audio: "audio/wordpool/STUDENT.wav", word: "Student" },
    { audio: "audio/wordpool/SUBWAY.wav", word: "Subway" },
    { audio: "audio/wordpool/SUITCASE.wav", word: "Suitcase" },
    { audio: "audio/wordpool/SUMMIT.wav", word: "Summit" },
    { audio: "audio/wordpool/SUNRISE.wav", word: "Sunrise" },
    { audio: "audio/wordpool/SUNSET.wav", word: "Sunset" },
    { audio: "audio/wordpool/SUPPER.wav", word: "Supper" },
    { audio: "audio/wordpool/SURVEY.wav", word: "Survey" },
    { audio: "audio/wordpool/SUSPECT.wav", word: "Suspect" },
    { audio: "audio/wordpool/SWAMP.wav", word: "Swamp" },
    { audio: "audio/wordpool/SWIMMER.wav", word: "Swimmer" },
    { audio: "audio/wordpool/SWITCH.wav", word: "Switch" },
    { audio: "audio/wordpool/SWORD.wav", word: "Sword" },
    { audio: "audio/wordpool/TABLE.wav", word: "Table" },
    { audio: "audio/wordpool/TABLET.wav", word: "Tablet" },
    { audio: "audio/wordpool/TART.wav", word: "Tart" },
    { audio: "audio/wordpool/TAXI.wav", word: "Taxi" },
    { audio: "audio/wordpool/TEACHER.wav", word: "Teacher" },
    { audio: "audio/wordpool/TEMPLE.wav", word: "Temple" },
    { audio: "audio/wordpool/TERMITE.wav", word: "Termite" },
    { audio: "audio/wordpool/THIEF.wav", word: "Thief" },
    { audio: "audio/wordpool/THREAD.wav", word: "Thread" },
    { audio: "audio/wordpool/TILE.wav", word: "Tile" },
    { audio: "audio/wordpool/TOASTER.wav", word: "Toaster" },
    { audio: "audio/wordpool/TOMBSTONE.wav", word: "Tombstone" },
    { audio: "audio/wordpool/TORTOISE.wav", word: "Tortoise" },
    { audio: "audio/wordpool/TOURIST.wav", word: "Tourist" },
    { audio: "audio/wordpool/TRACTOR.wav", word: "Tractor" },
    { audio: "audio/wordpool/TRANSPLANT.wav", word: "Transplant" },
    { audio: "audio/wordpool/TREAT.wav", word: "Treat" },
    { audio: "audio/wordpool/TRENCH.wav", word: "Trench" },
    { audio: "audio/wordpool/TRIBE.wav", word: "Tribe" },
    { audio: "audio/wordpool/TROMBONE.wav", word: "Trombone" },
    { audio: "audio/wordpool/TROUT.wav", word: "Trout" },
    { audio: "audio/wordpool/TRUCK.wav", word: "Truck" },
    { audio: "audio/wordpool/TUBA.wav", word: "Tuba" },
    { audio: "audio/wordpool/TUNNEL.wav", word: "Tunnel" },
    { audio: "audio/wordpool/TURKEY.wav", word: "Turkey" },
    { audio: "audio/wordpool/TURNIP.wav", word: "Turnip" },
    { audio: "audio/wordpool/TURTLE.wav", word: "Turtle" },
    { audio: "audio/wordpool/TUTU.wav", word: "Tutu" },
    { audio: "audio/wordpool/TWEEZERS.wav", word: "Tweezers" },
    { audio: "audio/wordpool/TWIG.wav", word: "Twig" },
    { audio: "audio/wordpool/TWISTER.wav", word: "Twister" },
    { audio: "audio/wordpool/TYPIST.wav", word: "Typist" },
    { audio: "audio/wordpool/ULCER.wav", word: "Ulcer" },
    { audio: "audio/wordpool/UMPIRE.wav", word: "Umpire" },
    { audio: "audio/wordpool/UNCLE.wav", word: "Uncle" },
    { audio: "audio/wordpool/VAGRANT.wav", word: "vagrant" },
    { audio: "audio/wordpool/VALLEY.wav", word: "Valley" },
    { audio: "audio/wordpool/VALVE.wav", word: "Valve" },
    { audio: "audio/wordpool/VELVET.wav", word: "Velvet" },
    { audio: "audio/wordpool/VENUS.wav", word: "Venus" },
    { audio: "audio/wordpool/VICTIM.wav", word: "Victim" },
    { audio: "audio/wordpool/VIKING.wav", word: "Viking" },
    { audio: "audio/wordpool/VIRUS.wav", word: "Virus" },
    { audio: "audio/wordpool/WAGON.wav", word: "Wagon" },
    { audio: "audio/wordpool/WAITER.wav", word: "Waiter" },
    { audio: "audio/wordpool/WAITRESS.wav", word: "Waitress" },
    { audio: "audio/wordpool/WARDROBE.wav", word: "Wardrobe" },
    { audio: "audio/wordpool/WASHER.wav", word: "Washer" },
    { audio: "audio/wordpool/WASP.wav", word: "Wasp" },
    { audio: "audio/wordpool/WHISKERS.wav", word: "Whiskers" },
    { audio: "audio/wordpool/WHISTLE.wav", word: "Whistle" },
    { audio: "audio/wordpool/WIDOW.wav", word: "Widow" },
    { audio: "audio/wordpool/WIFE.wav", word: "Wife" },
    { audio: "audio/wordpool/WINDOW.wav", word: "Window" },
    { audio: "audio/wordpool/WITNESS.wav", word: "Witness" },
    { audio: "audio/wordpool/WOMAN.wav", word: "Woman" },
    { audio: "audio/wordpool/WORKER.wav", word: "Worker" },
    { audio: "audio/wordpool/WORLD.wav", word: "World" },
    { audio: "audio/wordpool/WRENCH.wav", word: "Wrench" },
    { audio: "audio/wordpool/WRIST.wav", word: "Wrist" },
    { audio: "audio/wordpool/XEROX.wav", word: "Xerox" },
    { audio: "audio/wordpool/YACHT.wav", word: "Yacht" },
    { audio: "audio/wordpool/YARN.wav", word: "Yarn" },
    { audio: "audio/wordpool/ZEBRA.wav", word: "Zebra" },
    { audio: "audio/wordpool/ZIPPER.wav", word: "Zipper" },
  ];

  //randomize /audio/wordpool
  var timeline_variables = jsPsych.randomization.shuffle(wordpool);

  //ensure not to repeat words from wordpool
  var position = [];
  for (var i = 0; i < list_length; i++) {
    position.push(i - list_length);
  }

  // attention check... give list of 5 words, they have to correctly recall 3 to continue with experiment
  var att_instructions = {
    type: "html-keyboard-response",
    stimulus:
      "<p>You will now hear a practice list of words and be asked to recall them.  This will prepare you for the rest of the experiment.</p>\
        <p>Press any key to start the practice round.</p>",
    post_trial_gap: 1500,
  };
  timeline.push(att_instructions);

  timeline.push(sound_tone);

  var play_attention = {
    type: "audio-keyboard-response",
    stimulus: jsPsych.timelineVariable("audio"),
    trial_duration: presentation_rate,
    choices: jsPsych.NO_KEYS,
    data: function () {
      return {
        word: jsPsych.timelineVariable("word").toLowerCase(),
        type: "ATT_WORD",
      };
    },
  };

  // array of words presented during attention check
  var att_list = [];

  // present attention check words
  var att_pres = {
    timeline: [play_attention],
    timeline_variables: timeline_variables,
    sample: {
      type: "custom",
      fn: function () {
        wpool_len = timeline_variables.length; // should be 554... pick words 550 - 554
        att_arr = [];
        for (var w = wpool_len - 5; w < wpool_len; w++) {
          att_arr.push(w);
        }
        return att_arr;
      },
    },
    on_finish: function (data) {
      att_list.push(
        jsPsych.data.getLastTrialData().values()[0].word.toLowerCase(),
      );
    },
  };
  timeline.push(att_pres);

  // attention check recall
  var att_correct = 0;
  var att_trials = 0;
  var first_recall_checked = false;
  var started_correctly = false;
  var att_time_left = true;

  var att_recall_length = 30000;
  function att_recall_over() {
    jsPsych.finishTrial({ response: { Q0: "null" }, rt: null });
    att_time_left = false;
  }
  function end_att_recall() {
    setTimeout(att_recall_over, att_recall_length);
  }

  var att_recall_timer = {
    type: "call-function",
    func: end_att_recall,
  };

  var att_recall = {
    type: "survey-text",
    questions: [
      {
        prompt: function () {
          var direction =
            initiation_condition == "primacy"
              ? "<b>beginning</b>"
              : "<b>end</b>";
          return (
            "<p>Recall the words you just heard. You MUST begin recall with a word from the " +
            direction +
            " of the list.</p>"
          );
        },
      },
    ],
    post_trial_gap: 1,
    data: function () {
      return { type: "ATT_REC" };
    },
    on_finish: function (data) {
      var att_recalled = (
        data.response && data.response.Q0 ? data.response.Q0 : ""
      )
        .toString()
        .toLowerCase();
      var serial_pos = att_list.indexOf(att_recalled) + 1;
      if (att_list.indexOf(att_recalled) > -1) {
        att_correct++;
      }
      if (!first_recall_checked) {
        first_recall_checked = true;
        if (initiation_condition == "primacy") {
          started_correctly = serial_pos >= 1 && serial_pos <= 3;
        } else {
          started_correctly = serial_pos >= 3 && serial_pos <= 5;
        }
      }
      att_trials++;
    },
  };

  var att_rec_period = {
    timeline: [att_recall],
    loop_function: function () {
      if (att_trials < 5 && att_time_left) {
        return true;
      } else {
        return false;
      }
    },
  };
  timeline.push(att_recall_timer);
  timeline.push(att_rec_period);

  // if 3 or more words correctly recalled, continue with experiment
  // if 2 correct recalls, warn that poor attention will not qualify for more lucrative follow up
  // if less than 2 recalls, kick out
  var pass_att = {
    type: "html-keyboard-response",
    stimulus:
      "<p>Well done. You have passed the attention check. Press any key to continue.</p>",
  };

  var cont_att = {
    type: "html-button-response",
    stimulus:
      "<p>Please try to pay your best attention.  Remember that paying attention and giving your \
        best effort can qualify you for more lucrative follow up studies!</p> \
        <p>When you are ready and attentive, press Continue to proceed.</p>",
    choices: ["Continue"],
  };

  var fail_att = {
    type: "html-keyboard-response",
    response_ends_trial: false,
    stimulus:
      "<p>The preceding questions were designed to screen participants who are not carefully following the instructions of our study.</p> \
        <p>Please do not reload the page.</p> \
        <p>Based on your responses to these questions, we ask that you return this HIT to Prolific at this time.</p>",
    choices: jsPsych.NO_KEYS,
    trial_duration: 3000,
    on_finish: function () {
      jsPsych.endExperiment("Please return this study to Prolific.");
    },
  };

  var pass_node = {
    timeline: [pass_att],
    conditional_function: function () {
      if (att_correct >= 3 && started_correctly) {
        return true;
      } else {
        return false;
      }
    },
  };
  timeline.push(pass_node);

  var cont_node = {
    timeline: [cont_att],
    conditional_function: function () {
      if (att_correct == 2 && started_correctly) {
        return true;
      } else {
        return false;
      }
    },
  };
  timeline.push(cont_node);

  var fail_node = {
    timeline: [fail_att],
    conditional_function: function () {
      if (att_correct < 2 || !started_correctly) {
        return true;
      } else {
        return false;
      }
    },
  };
  timeline.push(fail_node);

  var start_experiment = {
    type: "html-button-response",
    stimulus:
      "<p>You are ready for the first list of words!</p><p>Press Start to proceed.</p>",
    choices: ["Start"],
    post_trial_gap: 1000,
  };
  timeline.push(start_experiment);

  var hold_keys_instructions = {
    type: "html-keyboard-response",
    stimulus:
      "<p>In order for the audio to play, please hold down both the <b>A</b> and <b>L</b> keys on your keyboard.</p> \
        <p>You will keep these keys held down as each list of words is played, and then you may remove them when it is time to \
        type your response.</p><p>Hold <b>A</b> and <b>L</b> to hear the list.</p>",
    trial_duration: 15000,
    choices: ["a", "l"],
    response_ends_trial: true,
    post_trial_gap: 1500,
  };

  //serial position of presented word
  var srpos = 0;
  //current list number (0-19)
  var curr_list = 0;

  var play_word = {
    type: "audio-keyboard-response",
    stimulus: jsPsych.timelineVariable("audio"),
    trial_duration: presentation_rate,
    choices: jsPsych.NO_KEYS,
    data: function () {
      srpos++;
      return {
        word: jsPsych.timelineVariable("word").toLowerCase(),
        serial_position: srpos,
        type: "WORD",
        list: curr_list,
      };
    },
  };

  // plays word if 'a' and 'l' pressed, loops if not (waiting for 'a' and 'l' to be pressed)
  /*var keydown_node = {
        timeline: [play_word],
        loop_function: function(data){
            if(!a_down || !l_down){
                tot_replays++;
                return true;
            } else {
                return false;
            };
        }
    };*/

  //array of words presented in the list
  var arr_list = [];

  //present list of list_length words at presentation_rate
  var list_presentation = {
    timeline: [play_word],
    timeline_variables: timeline_variables,
    sample: {
      type: "custom",
      fn: function () {
        position = position.map((n) => n + list_length);
        return position;
      },
    },
    on_finish: function (data) {
      arr_list.push(
        jsPsych.data.getLastTrialData().values()[0].word.toLowerCase(),
      );
    },
  };

  //recall instructions appear before first recall period
  var recall_instructions = {
    type: "html-button-response",
    stimulus: function () {
      if (initiation_condition == "primacy") {
        return "<p>You will now have 90 seconds to recall the words. You MUST begin recall with a word from the <b>beginning</b> of the list.</p><p>After your first response, recall in any order.</p><p>Type into the box and press the Enter key for each word.</p><p>Press the Start Recall button to begin recall.</p>";
      }
      if (initiation_condition == "recency") {
        return "<p>You will now have 90 seconds to recall the words. You MUST begin recall with a word from the <b>end</b> of the list.</p><p>After your first response, recall in any order.</p><p>Type into the box and press the Enter key for each word.</p><p>Press the Start Recall button to begin recall.</p>";
      }
    },
    choices: ["Start Recall"],
    post_trial_gap: 500,
  };

  //array of recalled words
  var rec_words = [];
  //array of response times of recalled words
  var rts = [];
  //boolean to loop free-recall trial
  var time_left = true;

  //participant responses added to arrays of recalled words and response times
  var free_recall = {
    type: "survey-text",
    questions: [
      {
        prompt:
          "<p>Recall the words from the list you just heard.</p><p> Press the Enter key or the Continue button to submit each word.</p>",
      },
    ],
    post_trial_gap: 1,
    data: function () {
      return { type: "REC_WORD", list: curr_list };
    },
    on_finish: function (data) {
      var recalled = (
        data.response && data.response.Q0 ? data.response.Q0 : "null"
      )
        .toString()
        .toLowerCase();
      if (recalled == "null") {
        data.serial_position = 99;
      } else {
        data.serial_position = 88;
      }
      for (var j = 0; j < arr_list.length; j++) {
        if (recalled == arr_list[j]) {
          data.serial_position = j + 1;
        }
      }
      data.recall_position = rec_words.length + 1;
      data.is_first_recall = rec_words.length === 0;
      data.rec_word = recalled;
      rec_words.push(recalled);
      rts.push(data.rt);
    },
  };

  //recall trials loop so long as there is time left (still within the 90s recall period)
  var recall_period = {
    timeline: [free_recall],
    loop_function: function () {
      if (time_left == true) {
        return true;
      } else {
        return false;
      }
    },
  };

  //recall timeout after 90s
  var recall_length = 90000;
  function recall_over() {
    jsPsych.finishTrial({ response: { Q0: "null" }, rt: null });
    return (time_left = false);
  }

  function end_recall() {
    setTimeout(recall_over, recall_length);
  }

  var recall_timer = {
    type: "call-function",
    func: end_recall,
  };

  //page that prompts participant to move onto next list, resets variables, empties arrays
  var ready = {
    type: "html-button-response",
    stimulus:
      "Press the Ready button when you are ready for the next list of words.",
    choices: ["Ready"],
    post_trial_gap: 1000,
    on_finish: function (data) {
      srpos = 0;
      srposR = 88;
      time_left = true;
      arr_list = [];
      rec_words = [];
      rts = [];
      curr_list++;
    },
  };

  // notes
  var notes = {
    type: "html-button-response",
    stimulus: "<p class = inst>Did you write notes during this session?</p>",
    choices: ["Yes", "No"],
    on_finish: function (data) {
      var resp = data.response;
      if (resp == 0) {
        data.notes = true; // subject took notes
      } else {
        data.notes = false; // subject didn't take notes
      }
    },
  };

  var final_page = {
    type: "html-keyboard-response",
    stimulus: "Thank you for participating in the experiment.",
    choices: jsPsych.NO_KEYS,
    trial_duration: 3500,
  };

  var save_and_redirect = {
    type: "call-function",
    async: true,
    func: function (done) {
        jsPsych.data.addProperties({
            l_length: list_length,
            pres_rate: presentation_rate,
            num_lists: num_lists,
            session: 2,           // change to 2, 3, 4 per file
            replays: tot_replays,
            prolific_pid: prolific_pid,
            study_id: study_id,
            session_id: session_id,
            initiation_condition: initiation_condition,
        });

        saveData()
            .then(function (response) {
                if (!response.ok) throw new Error("Save failed: " + response.status);
                window.location.href = PROLIFIC_COMPLETE_URL;
            })
            .catch(function (error) {
                console.error("Save error:", error);
                document.body.innerHTML =
                    '<div style="padding:40px;font-family:sans-serif;color:black;background:white;">' +
                    '<h2>Your data could not be saved automatically.</h2>' +
                    '<p>Please email <a href="mailto:kahanalab@gmail.com">kahanalab@gmail.com</a> with:</p>' +
                    '<ul><li>Your Prolific ID: <b>' + prolific_pid + '</b></li>' +
                    '<li>Error: ' + error.message + '</li></ul>' +
                    '<p>Then enter the completion code <b>' + COMPLETION_CODE + '</b> on Prolific.</p>' +
                    '</div>';
                done();
            });
    },
};


  //timeline blocking: depends on if first list (recall instructions), last list (final page), or somewhere in between (ready page)
  var num_lists = 12; // just go with 12 lists
  for (var list_no = 1; list_no < num_lists + 1; list_no++) {
    if (list_no == 1) {
      timeline.push(hold_keys_instructions);
      timeline.push(sound_tone);
      timeline.push(list_presentation);
      timeline.push(recall_instructions);
      timeline.push(recall_timer);
      timeline.push(recall_period);
      timeline.push(ready);
    } else if (list_no > 1 && list_no < num_lists) {
      timeline.push(hold_keys_instructions);
      timeline.push(sound_tone);
      timeline.push(list_presentation);
      timeline.push(recall_instructions);
      timeline.push(recall_timer);
      timeline.push(recall_period);
      timeline.push(ready);
    } else {
      timeline.push(hold_keys_instructions);
      timeline.push(sound_tone);
      timeline.push(list_presentation);
      timeline.push(recall_instructions);
      timeline.push(recall_timer);
      timeline.push(recall_period);
      timeline.push(notes);
      timeline.push(final_page);
    }
  }

  timeline.push(save_and_redirect);

  jsPsych.init({
    timeline: timeline,
    max_load_time: 120000,
    preload_audio: [
      "/audio/wordpool/ACTOR.wav",
      "/audio/wordpool/ACTRESS.wav",
      "/audio/wordpool/AGENT.wav",
      "/audio/wordpool/AIRPLANE.wav",
      "/audio/wordpool/AIRPORT.wav",
      "/audio/wordpool/ANKLE.wav",
      "/audio/wordpool/ANTLER.wav",
      "/audio/wordpool/APPLE.wav",
      "/audio/wordpool/APRON.wav",
      "/audio/wordpool/ARM.wav",
      "/audio/wordpool/ARMY.wav",
      "/audio/wordpool/ASIA.wav",
      "/audio/wordpool/ATLAS.wav",
      "/audio/wordpool/ATOM.wav",
      "/audio/wordpool/AUTHOR.wav",
      "/audio/wordpool/AWARD.wav",
      "/audio/wordpool/BABY.wav",
      "/audio/wordpool/BACKBONE.wav",
      "/audio/wordpool/BACON.wav",
      "/audio/wordpool/BADGE.wav",
      "/audio/wordpool/BALLOON.wav",
      "/audio/wordpool/BANJO.wav",
      "/audio/wordpool/BANK.wav",
      "/audio/wordpool/BANKER.wav",
      "/audio/wordpool/BANQUET.wav",
      "/audio/wordpool/BARLEY.wav",
      "/audio/wordpool/BARREL.wav",
      "/audio/wordpool/BASEMENT.wav",
      "/audio/wordpool/BATHTUB.wav",
      "/audio/wordpool/BEAKER.wav",
      "/audio/wordpool/BEAST.wav",
      "/audio/wordpool/BEAVER.wav",
      "/audio/wordpool/BEEF.wav",
      "/audio/wordpool/BELLY.wav",
      "/audio/wordpool/BIKE.wav",
      "/audio/wordpool/BINDER.wav",
      "/audio/wordpool/BISON.wav",
      "/audio/wordpool/BLACKBOARD.wav",
      "/audio/wordpool/BLADE.wav",
      "/audio/wordpool/BLENDER.wav",
      "/audio/wordpool/BLOCKADE.wav",
      "/audio/wordpool/BLOUSE.wav",
      "/audio/wordpool/BLUEPRINT.wav",
      "/audio/wordpool/BODY.wav",
      "/audio/wordpool/BOUQUET.wav",
      "/audio/wordpool/BOX.wav",
      "/audio/wordpool/BOYFRIEND.wav",
      "/audio/wordpool/BRACES.wav",
      "/audio/wordpool/BRANCH.wav",
      "/audio/wordpool/BRANDY.wav",
      "/audio/wordpool/BREAST.wav",
      "/audio/wordpool/BRICK.wav",
      "/audio/wordpool/BRIEFCASE.wav",
      "/audio/wordpool/BROOK.wav",
      "/audio/wordpool/BROTHER.wav",
      "/audio/wordpool/BUBBLE.wav",
      "/audio/wordpool/BUCKET.wav",
      "/audio/wordpool/BUG.wav",
      "/audio/wordpool/BUGGY.wav",
      "/audio/wordpool/BULLET.wav",
      "/audio/wordpool/BUNNY.wav",
      "/audio/wordpool/BUREAU.wav",
      "/audio/wordpool/BURGLAR.wav",
      "/audio/wordpool/BUTCHER.wav",
      "/audio/wordpool/CABBAGE.wav",
      "/audio/wordpool/CABIN.wav",
      "/audio/wordpool/CAFE.wav",
      "/audio/wordpool/CAMEL.wav",
      "/audio/wordpool/CANAL.wav",
      "/audio/wordpool/CANDY.wav",
      "/audio/wordpool/CANYON.wav",
      "/audio/wordpool/CAPTIVE.wav",
      "/audio/wordpool/CARRIAGE.wav",
      "/audio/wordpool/CARROT.wav",
      "/audio/wordpool/CASHEW.wav",
      "/audio/wordpool/CASHIER.wav",
      "/audio/wordpool/CASKET.wav",
      "/audio/wordpool/CATCHER.wav",
      "/audio/wordpool/CATTLE.wav",
      "/audio/wordpool/CELLAR.wav",
      "/audio/wordpool/CHAMPAGNE.wav",
      "/audio/wordpool/CHAPEL.wav",
      "/audio/wordpool/CHAUFFEUR.wav",
      "/audio/wordpool/CHEMIST.wav",
      "/audio/wordpool/CHEST.wav",
      "/audio/wordpool/CHILD.wav",
      "/audio/wordpool/CHIPMUNK.wav",
      "/audio/wordpool/CHURCH.wav",
      "/audio/wordpool/CIGAR.wav",
      "/audio/wordpool/CITRUS.wav",
      "/audio/wordpool/CLAM.wav",
      "/audio/wordpool/CLAMP.wav",
      "/audio/wordpool/CLIMBER.wav",
      "/audio/wordpool/CLOCK.wav",
      "/audio/wordpool/CLOTHES.wav",
      "/audio/wordpool/CLOUD.wav",
      "/audio/wordpool/COBRA.wav",
      "/audio/wordpool/COCKTAIL.wav",
      "/audio/wordpool/COCOON.wav",
      "/audio/wordpool/COD.wav",
      "/audio/wordpool/COFFEE.wav",
      "/audio/wordpool/COIN.wav",
      "/audio/wordpool/COLLEGE.wav",
      "/audio/wordpool/COMET.wav",
      "/audio/wordpool/COMPASS.wav",
      "/audio/wordpool/CONCERT.wav",
      "/audio/wordpool/CONTRACT.wav",
      "/audio/wordpool/CONVICT.wav",
      "/audio/wordpool/COOK.wav",
      "/audio/wordpool/COOKBOOK.wav",
      "/audio/wordpool/COSTUME.wav",
      "/audio/wordpool/COTTAGE.wav",
      "/audio/wordpool/COUCH.wav",
      "/audio/wordpool/COUNTRY.wav",
      "/audio/wordpool/COUNTY.wav",
      "/audio/wordpool/COUSIN.wav",
      "/audio/wordpool/COWBOY.wav",
      "/audio/wordpool/CRAB.wav",
      "/audio/wordpool/CRATER.wav",
      "/audio/wordpool/CRAYON.wav",
      "/audio/wordpool/CREATURE.wav",
      "/audio/wordpool/CREVICE.wav",
      "/audio/wordpool/CRIB.wav",
      "/audio/wordpool/CRICKET.wav",
      "/audio/wordpool/CRITIC.wav",
      "/audio/wordpool/CROSS.wav",
      "/audio/wordpool/CROWN.wav",
      "/audio/wordpool/CRUTCH.wav",
      "/audio/wordpool/CUPBOARD.wav",
      "/audio/wordpool/CURTAIN.wav",
      "/audio/wordpool/CUSTARD.wav",
      "/audio/wordpool/CYCLONE.wav",
      "/audio/wordpool/DAISY.wav",
      "/audio/wordpool/DANCER.wav",
      "/audio/wordpool/DANDRUFF.wav",
      "/audio/wordpool/DASHBOARD.wav",
      "/audio/wordpool/DAUGHTER.wav",
      "/audio/wordpool/DENIM.wav",
      "/audio/wordpool/DENTIST.wav",
      "/audio/wordpool/DIME.wav",
      "/audio/wordpool/DINER.wav",
      "/audio/wordpool/DIVER.wav",
      "/audio/wordpool/DOLPHIN.wav",
      "/audio/wordpool/DONKEY.wav",
      "/audio/wordpool/DONOR.wav",
      "/audio/wordpool/DORM.wav",
      "/audio/wordpool/DOUGHNUT.wav",
      "/audio/wordpool/DRAGON.wav",
      "/audio/wordpool/DRAWING.wav",
      "/audio/wordpool/DRESS.wav",
      "/audio/wordpool/DRESSER.wav",
      "/audio/wordpool/DRILL.wav",
      "/audio/wordpool/DRINK.wav",
      "/audio/wordpool/DRIVER.wav",
      "/audio/wordpool/DRUG.wav",
      "/audio/wordpool/DUST.wav",
      "/audio/wordpool/DUSTPAN.wav",
      "/audio/wordpool/EAGLE.wav",
      "/audio/wordpool/EGYPT.wav",
      "/audio/wordpool/ELBOW.wav",
      "/audio/wordpool/EMPIRE.wav",
      "/audio/wordpool/EUROPE.wav",
      "/audio/wordpool/EXPERT.wav",
      "/audio/wordpool/EYELASH.wav",
      "/audio/wordpool/FARMER.wav",
      "/audio/wordpool/FEMALE.wav",
      "/audio/wordpool/FIDDLE.wav",
      "/audio/wordpool/FILM.wav",
      "/audio/wordpool/FINGER.wav",
      "/audio/wordpool/FIREMAN.wav",
      "/audio/wordpool/FIREPLACE.wav",
      "/audio/wordpool/FLAG.wav",
      "/audio/wordpool/FLASHLIGHT.wav",
      "/audio/wordpool/FLASK.wav",
      "/audio/wordpool/FLEET.wav",
      "/audio/wordpool/FLESH.wav",
      "/audio/wordpool/FLIPPER.wav",
      "/audio/wordpool/FLOWER.wav",
      "/audio/wordpool/FLUTE.wav",
      "/audio/wordpool/FOOT.wav",
      "/audio/wordpool/FOOTBALL.wav",
      "/audio/wordpool/FOREHEAD.wav",
      "/audio/wordpool/FOREST.wav",
      "/audio/wordpool/FOX.wav",
      "/audio/wordpool/FRAGRANCE.wav",
      "/audio/wordpool/FRAME.wav",
      "/audio/wordpool/FRANCE.wav",
      "/audio/wordpool/FRECKLE.wav",
      "/audio/wordpool/FREEZER.wav",
      "/audio/wordpool/FRIEND.wav",
      "/audio/wordpool/FRUIT.wav",
      "/audio/wordpool/FUNGUS.wav",
      "/audio/wordpool/GALLON.wav",
      "/audio/wordpool/GANGSTER.wav",
      "/audio/wordpool/GARBAGE.wav",
      "/audio/wordpool/GARDEN.wav",
      "/audio/wordpool/GARLIC.wav",
      "/audio/wordpool/GAVEL.wav",
      "/audio/wordpool/GAZELLE.wav",
      "/audio/wordpool/GHETTO.wav",
      "/audio/wordpool/GIFT.wav",
      "/audio/wordpool/GIRL.wav",
      "/audio/wordpool/GLASS.wav",
      "/audio/wordpool/GLOBE.wav",
      "/audio/wordpool/GLOVE.wav",
      "/audio/wordpool/GOBLIN.wav",
      "/audio/wordpool/GRAPE.wav",
      "/audio/wordpool/GRAVE.wav",
      "/audio/wordpool/GRAVEL.wav",
      "/audio/wordpool/GRILL.wav",
      "/audio/wordpool/GROUND.wav",
      "/audio/wordpool/GUARD.wav",
      "/audio/wordpool/GUITAR.wav",
      "/audio/wordpool/GYMNAST.wav",
      "/audio/wordpool/HAMPER.wav",
      "/audio/wordpool/HAND.wav",
      "/audio/wordpool/HANDBAG.wav",
      "/audio/wordpool/HARP.wav",
      "/audio/wordpool/HATCHET.wav",
      "/audio/wordpool/HAWK.wav",
      "/audio/wordpool/HEADBAND.wav",
      "/audio/wordpool/HEART.wav",
      "/audio/wordpool/HEDGE.wav",
      "/audio/wordpool/HELMET.wav",
      "/audio/wordpool/HERO.wav",
      "/audio/wordpool/HIGHWAY.wav",
      "/audio/wordpool/HIKER.wav",
      "/audio/wordpool/HONEY.wav",
      "/audio/wordpool/HOOD.wav",
      "/audio/wordpool/HOOK.wav",
      "/audio/wordpool/HORNET.wav",
      "/audio/wordpool/HOSTESS.wav",
      "/audio/wordpool/HOUND.wav",
      "/audio/wordpool/HUMAN.wav",
      "/audio/wordpool/HUSBAND.wav",
      "/audio/wordpool/ICEBERG.wav",
      "/audio/wordpool/ICING.wav",
      "/audio/wordpool/IGLOO.wav",
      "/audio/wordpool/INFANT.wav",
      "/audio/wordpool/INMATE.wav",
      "/audio/wordpool/ISLAND.wav",
      "/audio/wordpool/ITEM.wav",
      "/audio/wordpool/JAPAN.wav",
      "/audio/wordpool/JELLO.wav",
      "/audio/wordpool/JELLY.wav",
      "/audio/wordpool/JOURNAL.wav",
      "/audio/wordpool/JUDGE.wav",
      "/audio/wordpool/JUGGLER.wav",
      "/audio/wordpool/JUNGLE.wav",
      "/audio/wordpool/JURY.wav",
      "/audio/wordpool/KEEPER.wav",
      "/audio/wordpool/KETCHUP.wav",
      "/audio/wordpool/KIDNEY.wav",
      "/audio/wordpool/KITCHEN.wav",
      "/audio/wordpool/KLEENEX.wav",
      "/audio/wordpool/KNAPSACK.wav",
      "/audio/wordpool/KNIFE.wav",
      "/audio/wordpool/LABEL.wav",
      "/audio/wordpool/LACE.wav",
      "/audio/wordpool/LADY.wav",
      "/audio/wordpool/LAGOON.wav",
      "/audio/wordpool/LAKE.wav",
      "/audio/wordpool/LAMP.wav",
      "/audio/wordpool/LAPEL.wav",
      "/audio/wordpool/LASER.wav",
      "/audio/wordpool/LAVA.wav",
      "/audio/wordpool/LEADER.wav",
      "/audio/wordpool/LEG.wav",
      "/audio/wordpool/LEOPARD.wav",
      "/audio/wordpool/LETTUCE.wav",
      "/audio/wordpool/LIGHTNING.wav",
      "/audio/wordpool/LILY.wav",
      "/audio/wordpool/LION.wav",
      "/audio/wordpool/LIPSTICK.wav",
      "/audio/wordpool/LIVER.wav",
      "/audio/wordpool/LIZARD.wav",
      "/audio/wordpool/LODGE.wav",
      "/audio/wordpool/LOFT.wav",
      "/audio/wordpool/LONDON.wav",
      "/audio/wordpool/LOVER.wav",
      "/audio/wordpool/LUGGAGE.wav",
      "/audio/wordpool/LUMBER.wav",
      "/audio/wordpool/LUNCH.wav",
      "/audio/wordpool/MACHINE.wav",
      "/audio/wordpool/MAILBOX.wav",
      "/audio/wordpool/MAILMAN.wav",
      "/audio/wordpool/MAMMAL.wav",
      "/audio/wordpool/MAPLE.wav",
      "/audio/wordpool/MARINE.wav",
      "/audio/wordpool/MARKER.wav",
      "/audio/wordpool/MARKET.wav",
      "/audio/wordpool/MARROW.wav",
      "/audio/wordpool/MARS.wav",
      "/audio/wordpool/MARSH.wav",
      "/audio/wordpool/MASK.wav",
      "/audio/wordpool/MATCH.wav",
      "/audio/wordpool/MATTRESS.wav",
      "/audio/wordpool/MESSAGE.wav",
      "/audio/wordpool/MILDEW.wav",
      "/audio/wordpool/MILK.wav",
      "/audio/wordpool/MISSILE.wav",
      "/audio/wordpool/MISTER.wav",
      "/audio/wordpool/MONEY.wav",
      "/audio/wordpool/MONSTER.wav",
      "/audio/wordpool/MOP.wav",
      "/audio/wordpool/MOTEL.wav",
      "/audio/wordpool/MOTOR.wav",
      "/audio/wordpool/MUFFIN.wav",
      "/audio/wordpool/MUMMY.wav",
      "/audio/wordpool/MUSTARD.wav",
      "/audio/wordpool/NAPKIN.wav",
      "/audio/wordpool/NECKLACE.wav",
      "/audio/wordpool/NEUTRON.wav",
      "/audio/wordpool/NIGHTGOWN.wav",
      "/audio/wordpool/NOMAD.wav",
      "/audio/wordpool/NOTEBOOK.wav",
      "/audio/wordpool/NOVEL.wav",
      "/audio/wordpool/NURSE.wav",
      "/audio/wordpool/OFFICE.wav",
      "/audio/wordpool/OINTMENT.wav",
      "/audio/wordpool/OMELET.wav",
      "/audio/wordpool/ONION.wav",
      "/audio/wordpool/ORANGE.wav",
      "/audio/wordpool/ORCHID.wav",
      "/audio/wordpool/OUTDOORS.wav",
      "/audio/wordpool/OUTFIT.wav",
      "/audio/wordpool/OUTLAW.wav",
      "/audio/wordpool/OX.wav",
      "/audio/wordpool/OYSTER.wav",
      "/audio/wordpool/OZONE.wav",
      "/audio/wordpool/PACKAGE.wav",
      "/audio/wordpool/PADDING.wav",
      "/audio/wordpool/PADDLE.wav",
      "/audio/wordpool/PALACE.wav",
      "/audio/wordpool/PANTHER.wav",
      "/audio/wordpool/PAPER.wav",
      "/audio/wordpool/PARENT.wav",
      "/audio/wordpool/PARROT.wav",
      "/audio/wordpool/PARSLEY.wav",
      "/audio/wordpool/PARTNER.wav",
      "/audio/wordpool/PASSAGE.wav",
      "/audio/wordpool/PASTA.wav",
      "/audio/wordpool/PASTRY.wav",
      "/audio/wordpool/PATIENT.wav",
      "/audio/wordpool/PATROL.wav",
      "/audio/wordpool/PEACH.wav",
      "/audio/wordpool/PEANUT.wav",
      "/audio/wordpool/PEBBLE.wav",
      "/audio/wordpool/PECAN.wav",
      "/audio/wordpool/PENGUIN.wav",
      "/audio/wordpool/PEPPER.wav",
      "/audio/wordpool/PERCH.wav",
      "/audio/wordpool/PERFUME.wav",
      "/audio/wordpool/PERMIT.wav",
      "/audio/wordpool/PIANO.wav",
      "/audio/wordpool/PICNIC.wav",
      "/audio/wordpool/PICTURE.wav",
      "/audio/wordpool/PIGEON.wav",
      "/audio/wordpool/PIGMENT.wav",
      "/audio/wordpool/PILOT.wav",
      "/audio/wordpool/PIMPLE.wav",
      "/audio/wordpool/PISTOL.wav",
      "/audio/wordpool/PISTON.wav",
      "/audio/wordpool/PIZZA.wav",
      "/audio/wordpool/PLAID.wav",
      "/audio/wordpool/PLASTER.wav",
      "/audio/wordpool/PLATE.wav",
      "/audio/wordpool/PLAYGROUND.wav",
      "/audio/wordpool/PLAZA.wav",
      "/audio/wordpool/PLIERS.wav",
      "/audio/wordpool/PLUTO.wav",
      "/audio/wordpool/POCKET.wav",
      "/audio/wordpool/POET.wav",
      "/audio/wordpool/POISON.wav",
      "/audio/wordpool/POLICE.wav",
      "/audio/wordpool/POPCORN.wav",
      "/audio/wordpool/PORK.wav",
      "/audio/wordpool/PORTRAIT.wav",
      "/audio/wordpool/POSSUM.wav",
      "/audio/wordpool/POSTAGE.wav",
      "/audio/wordpool/POWDER.wav",
      "/audio/wordpool/PREACHER.wav",
      "/audio/wordpool/PRIMATE.wav",
      "/audio/wordpool/PRINCESS.wav",
      "/audio/wordpool/PROTON.wav",
      "/audio/wordpool/PUDDING.wav",
      "/audio/wordpool/PUDDLE.wav",
      "/audio/wordpool/PUPPY.wav",
      "/audio/wordpool/QUAIL.wav",
      "/audio/wordpool/QUARTER.wav",
      "/audio/wordpool/QUEEN.wav",
      "/audio/wordpool/RABBIT.wav",
      "/audio/wordpool/RACKET.wav",
      "/audio/wordpool/RADISH.wav",
      "/audio/wordpool/RAFT.wav",
      "/audio/wordpool/RATTLE.wav",
      "/audio/wordpool/RAZOR.wav",
      "/audio/wordpool/REBEL.wav",
      "/audio/wordpool/RECEIPT.wav",
      "/audio/wordpool/RECORD.wav",
      "/audio/wordpool/RELISH.wav",
      "/audio/wordpool/REPORT.wav",
      "/audio/wordpool/RIFLE.wav",
      "/audio/wordpool/RIVER.wav",
      "/audio/wordpool/ROBBER.wav",
      "/audio/wordpool/ROBIN.wav",
      "/audio/wordpool/ROBOT.wav",
      "/audio/wordpool/ROCKET.wav",
      "/audio/wordpool/ROD.wav",
      "/audio/wordpool/ROOSTER.wav",
      "/audio/wordpool/RUG.wav",
      "/audio/wordpool/RUST.wav",
      "/audio/wordpool/SADDLE.wav",
      "/audio/wordpool/SALAD.wav",
      "/audio/wordpool/SALMON.wav",
      "/audio/wordpool/SALT.wav",
      "/audio/wordpool/SANDWICH.wav",
      "/audio/wordpool/SAUSAGE.wav",
      "/audio/wordpool/SCALLOP.wav",
      "/audio/wordpool/SCALPEL.wav",
      "/audio/wordpool/SCARECROW.wav",
      "/audio/wordpool/SCARF.wav",
      "/audio/wordpool/SCISSORS.wav",
      "/audio/wordpool/SCOTCH.wav",
      "/audio/wordpool/SCRIBBLE.wav",
      "/audio/wordpool/SCULPTURE.wav",
      "/audio/wordpool/SEAFOOD.wav",
      "/audio/wordpool/SEAGULL.wav",
      "/audio/wordpool/SEAL.wav",
      "/audio/wordpool/SERVANT.wav",
      "/audio/wordpool/SERVER.wav",
      "/audio/wordpool/SHARK.wav",
      "/audio/wordpool/SHELF.wav",
      "/audio/wordpool/SHELTER.wav",
      "/audio/wordpool/SHERIFF.wav",
      "/audio/wordpool/SHIRT.wav",
      "/audio/wordpool/SHORTCAKE.wav",
      "/audio/wordpool/SHORTS.wav",
      "/audio/wordpool/SHOULDER.wav",
      "/audio/wordpool/SHOVEL.wav",
      "/audio/wordpool/SHRUB.wav",
      "/audio/wordpool/SIBLING.wav",
      "/audio/wordpool/SIDEWALK.wav",
      "/audio/wordpool/SILK.wav",
      "/audio/wordpool/SISTER.wav",
      "/audio/wordpool/SKETCH.wav",
      "/audio/wordpool/SKILLET.wav",
      "/audio/wordpool/SKIRT.wav",
      "/audio/wordpool/SLIDE.wav",
      "/audio/wordpool/SLIME.wav",
      "/audio/wordpool/SLOPE.wav",
      "/audio/wordpool/SLUG.wav",
      "/audio/wordpool/SMOG.wav",
      "/audio/wordpool/SNACK.wav",
      "/audio/wordpool/SNAIL.wav",
      "/audio/wordpool/SNAKE.wav",
      "/audio/wordpool/SODA.wav",
      "/audio/wordpool/SOFTBALL.wav",
      "/audio/wordpool/SPACE.wav",
      "/audio/wordpool/SPARROW.wav",
      "/audio/wordpool/SPHINX.wav",
      "/audio/wordpool/SPIDER.wav",
      "/audio/wordpool/SPONGE.wav",
      "/audio/wordpool/SPOOL.wav",
      "/audio/wordpool/SPOON.wav",
      "/audio/wordpool/SPOUSE.wav",
      "/audio/wordpool/STALLION.wav",
      "/audio/wordpool/STAMP.wav",
      "/audio/wordpool/STAPLE.wav",
      "/audio/wordpool/STAR.wav",
      "/audio/wordpool/STATUE.wav",
      "/audio/wordpool/STICKER.wav",
      "/audio/wordpool/STOMACH.wav",
      "/audio/wordpool/STONE.wav",
      "/audio/wordpool/STOVE.wav",
      "/audio/wordpool/STREAM.wav",
      "/audio/wordpool/STUDENT.wav",
      "/audio/wordpool/SUBWAY.wav",
      "/audio/wordpool/SUITCASE.wav",
      "/audio/wordpool/SUMMIT.wav",
      "/audio/wordpool/SUNRISE.wav",
      "/audio/wordpool/SUNSET.wav",
      "/audio/wordpool/SUPPER.wav",
      "/audio/wordpool/SURVEY.wav",
      "/audio/wordpool/SUSPECT.wav",
      "/audio/wordpool/SWAMP.wav",
      "/audio/wordpool/SWIMMER.wav",
      "/audio/wordpool/SWITCH.wav",
      "/audio/wordpool/SWORD.wav",
      "/audio/wordpool/TABLE.wav",
      "/audio/wordpool/TABLET.wav",
      "/audio/wordpool/TART.wav",
      "/audio/wordpool/TAXI.wav",
      "/audio/wordpool/TEACHER.wav",
      "/audio/wordpool/TEMPLE.wav",
      "/audio/wordpool/TERMITE.wav",
      "/audio/wordpool/THIEF.wav",
      "/audio/wordpool/THREAD.wav",
      "/audio/wordpool/TILE.wav",
      "/audio/wordpool/TOASTER.wav",
      "/audio/wordpool/TOMBSTONE.wav",
      "/audio/wordpool/TORTOISE.wav",
      "/audio/wordpool/TOURIST.wav",
      "/audio/wordpool/TRACTOR.wav",
      "/audio/wordpool/TRANSPLANT.wav",
      "/audio/wordpool/TREAT.wav",
      "/audio/wordpool/TRENCH.wav",
      "/audio/wordpool/TRIBE.wav",
      "/audio/wordpool/TROMBONE.wav",
      "/audio/wordpool/TROUT.wav",
      "/audio/wordpool/TRUCK.wav",
      "/audio/wordpool/TUBA.wav",
      "/audio/wordpool/TUNNEL.wav",
      "/audio/wordpool/TURKEY.wav",
      "/audio/wordpool/TURNIP.wav",
      "/audio/wordpool/TURTLE.wav",
      "/audio/wordpool/TUTU.wav",
      "/audio/wordpool/TWEEZERS.wav",
      "/audio/wordpool/TWIG.wav",
      "/audio/wordpool/TWISTER.wav",
      "/audio/wordpool/TYPIST.wav",
      "/audio/wordpool/ULCER.wav",
      "/audio/wordpool/UMPIRE.wav",
      "/audio/wordpool/UNCLE.wav",
      "/audio/wordpool/VAGRANT.wav",
      "/audio/wordpool/VALLEY.wav",
      "/audio/wordpool/VALVE.wav",
      "/audio/wordpool/VELVET.wav",
      "/audio/wordpool/VENUS.wav",
      "/audio/wordpool/VICTIM.wav",
      "/audio/wordpool/VIKING.wav",
      "/audio/wordpool/VIRUS.wav",
      "/audio/wordpool/WAGON.wav",
      "/audio/wordpool/WAITER.wav",
      "/audio/wordpool/WAITRESS.wav",
      "/audio/wordpool/WARDROBE.wav",
      "/audio/wordpool/WASHER.wav",
      "/audio/wordpool/WASP.wav",
      "/audio/wordpool/WHISKERS.wav",
      "/audio/wordpool/WHISTLE.wav",
      "/audio/wordpool/WIDOW.wav",
      "/audio/wordpool/WIFE.wav",
      "/audio/wordpool/WINDOW.wav",
      "/audio/wordpool/WITNESS.wav",
      "/audio/wordpool/WOMAN.wav",
      "/audio/wordpool/WORKER.wav",
      "/audio/wordpool/WORLD.wav",
      "/audio/wordpool/WRENCH.wav",
      "/audio/wordpool/WRIST.wav",
      "/audio/wordpool/XEROX.wav",
      "/audio/wordpool/YACHT.wav",
      "/audio/wordpool/YARN.wav",
      "/audio/wordpool/ZEBRA.wav",
      "/audio/wordpool/ZIPPER.wav",
      "/audio/wordpool/AudioTest/Test2.wav",
      "/audio/400Hz.wav",
    ],
  });
}

runExperiment();
