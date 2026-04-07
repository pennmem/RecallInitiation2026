function runExperiment() {

    var prolific_pid = jsPsych.data.getURLVariable('PROLIFIC_PID');
    var study_id = jsPsych.data.getURLVariable('STUDY_ID');
    var session_id = jsPsych.data.getURLVariable('SESSION_ID');

    var COMPLETION_CODE = "C1GJ32AY";
    var PROLIFIC_COMPLETE_URL = "https://app.prolific.com/submissions/complete?cc=" + COMPLETION_CODE;
    
    function saveData() {
        return fetch("/save", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                prolific_pid: prolific_pid,
                study_id: study_id,
                session_id: session_id,
                experiment: "dirFR3",           // <- add
                table_name: "dirfr",  // <- add
                data: jsPsych.data.get().values()
            })
        });
    }

    var initiation_conditions = ["primacy", "recency"];
    var initiation_condition = jsPsych.randomization.sampleWithoutReplacement(initiation_conditions, 1)[0];

    var timeline = [];

    var list_length = 20;
    var presentation_rate = 1000;

    // hold wheter keys are down
    var a_down = false;
    var l_down = false;
    // total replayed words -- if really high, exclude data
    var tot_replays = 0;

    // listen for pressing 'a' or 'l' keys down
    window.addEventListener('keydown', (e) => {
        var name = e.key;
        if(name == 'a'){
            a_down = true;
        } else if(name == 'l'){
            l_down = true;
        };
    });

    // listen for 'a' and 'l' keys being released
    window.addEventListener('keyup', (e) => {
        var name = e.key;
        if(name == 'a'){
            a_down = false;
        } else if(name == 'l'){
            l_down = false;
        };
    });

    // Mike/Ricardo message
    var message = {
        type: "html-button-response",
        stimulus: "<p style = 'text-align:left;'>Dear Participant,<br>\
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
        choices: ['Blue', 'Orange'],
        on_finish: function(data){
            var resp = data.response;
            if(resp == 0){
                data.color = 'Blue';         // correct answer
            } else {
                data.color = 'Orange';       // wrong answer
            };
        }
    };
    timeline.push(message);

    let fail_message = {
        type: 'html-keyboard-response',
        response_ends_trial: false,
        stimulus: "<p>The preceding page was designed to screen participants who are not carefully paying attention.</p> \
        <p>Please do not reload the page.</p> \
        <p>Based on your responses to these questions, we ask that you return this HIT to Prolific at this time.</p>",
        choices: jsPsych.NO_KEYS,
        trial_duration: 3000,
        on_finish: function() {
            jsPsych.endExperiment("Please return this study to Prolific.");
        }
    };

    // check if correctly responded to message
    let message_node = {
        timeline: [fail_message],
        conditional_function: function(){
            // get the data from the previous trial,
            // and check which key was pressed
            var data = jsPsych.data.get().last(1).values()[0];
            if(data.response == 1) {
                return true;
            } else {
                return false;
            }
        }
    };
    timeline.push(message_node);



    // place lab's attention test here
    // includes timeout for people who don't answer correctly
    var lab_attention_check = jsPsychUtils.get_attention_check();
    timeline.push(lab_attention_check);

    //welcome page... something done from separate file called to by psiturk?
    var welcome = {
        type: "html-keyboard-response",
        stimulus: "<p>Welcome to the experiment.</p><p>Press any key to continue to the instructions.</p>"
    };
    timeline.push(welcome);

    //instructions page
    var instructions = {
        type: 'instructions',
        pages: [
            '<p>Congratulations! Based on your performance in our previous round of data collection \
            you have qualified for part 2 of our experiment.</p> \
            <p>Thank you for your attention and effort in part 1.</p> \
            <p>The next page will give you a refresher on how the experiment will run.</p>',
            '<p>In this experiment you will be presented with a list of words, which you will hear one after another.</p> \
            <p>Then, there will be a 90 second recall period where you will be asked to recall the words from the list \
            by typing them into the recall box. You may be asked to recall them in a particular order.</p><p>This process of hearing a list of words and \
            then recalling those words will repeat for 12 lists, all of different words.</p><p>Remember to recall words from \
            the immediately preceeding list during each recall period.</p>',
            '<p>Please do NOT write down words, as this experiment is trying to study human memory!</p> \
            <p>Also, please do give your full attention and best effort to recall as many words as you can.</p> \
            <p>Again, honest performance on this task will qualify you for up to 1 more further, more lucrative \
            follow up sessions.</p>',
            '<p>Thank you!</p><p>Press Next to continue to the audio test.</p>' 
        ],
        show_clickable_nav: true
    };
    timeline.push(instructions);

    var sound_tone = {
        type: 'audio-keyboard-response',
        stimulus: '/static/audio/400Hz.wav',
        trial_duration: 500,
        choices: jsPsych.NO_KEYS,
        post_trial_gap: 1000
    };

    var trial_audio = {
        type: 'audio-keyboard-response',
        stimulus: '/static/audio/wordpool/AudioTest/Test2.wav',
        choices: ['r', 'c'],
        prompt: "<p>Adjust your volume so you can clearly hear the audio.</p> \
        <p> This is important so that you can hear the words presented that you will be asked to recall.</p> \
        <p>Press R to replay the audio so that you can adjust your volume, or press C once the sound level is good \
        to continue with the experiment.</p>"
    };

    var audio_test = {
        timeline: [trial_audio],
        loop_function: function(data){
            if(data.values()[0].response == "r"){
                return true;
            } else if(data.values()[0].response == "c"){
                return false;
            }
        }
    };
    timeline.push(audio_test);

    //wordpool: at the moment, 554 words, commonness/similarity not taken into account
    var wordpool = [
        {audio: 'audio/wordpool/ACTOR.wav', word: "Actor"}, {audio: 'audio/wordpool/ACTRESS.wav', word: "Actress"}, {audio: 'audio/wordpool/AGENT.wav', word: "Agent"}, {audio: 'audio/wordpool/AIRPLANE.wav', word: "Airplane"}, {audio: 'audio/wordpool/AIRPORT.wav', word: "Airport"}, {audio: 'audio/wordpool/ANKLE.wav', word: "Ankle"}, {audio: 'audio/wordpool/ANTLER.wav', word: "Antler"}, {audio: 'audio/wordpool/APPLE.wav', word: "Apple"}, {audio: 'audio/wordpool/APRON.wav', word: "Apron"}, {audio: 'audio/wordpool/ARM.wav', word: "Arm"},{audio: 'audio/wordpool/ARMY.wav', word: "Army"}, {audio: 'audio/wordpool/ASIA.wav', word: "Asia"}, {audio: 'audio/wordpool/ATLAS.wav', word: "Atlas"}, {audio: 'audio/wordpool/ATOM.wav', word: "Atom"}, {audio: 'audio/wordpool/AUTHOR.wav', word: "Author"}, {audio: 'audio/wordpool/AWARD.wav', word: "Award"}, {audio: 'audio/wordpool/BABY.wav', word: "Baby"}, {audio: 'audio/wordpool/BACKBONE.wav', word: "Backbone"}, {audio: 'audio/wordpool/BACON.wav', word: "Bacon"}, {audio: 'audio/wordpool/BADGE.wav', word: "Badge"}, 
        {audio: 'audio/wordpool/BALLOON.wav', word: "Balloon"}, {audio: 'audio/wordpool/BANJO.wav', word: "Banjo"}, {audio: 'audio/wordpool/BANK.wav', word: "Bank"}, {audio: 'audio/wordpool/BANKER.wav', word: "Banker"}, {audio: 'audio/wordpool/BANQUET.wav', word: "Banquet"}, {audio: 'audio/wordpool/BARLEY.wav', word: "Barley"}, {audio: 'audio/wordpool/BARREL.wav', word: "Barrel"}, {audio: 'audio/wordpool/BASEMENT.wav', word: "Basement"}, {audio: 'audio/wordpool/BATHTUB.wav', word: "Bathtub"}, {audio: 'audio/wordpool/BEAKER.wav', word: "Beaker"}, {audio: 'audio/wordpool/BEAST.wav', word: "Beast"}, {audio: 'audio/wordpool/BEAVER.wav', word: "Beaver"}, {audio: 'audio/wordpool/BEEF.wav', word: "Beef"}, {audio: 'audio/wordpool/BELLY.wav', word: "Belly"}, {audio: 'audio/wordpool/BIKE.wav', word: "Bike"}, {audio: 'audio/wordpool/BINDER.wav', word: "Binder"}, {audio: 'audio/wordpool/BISON.wav', word: "Bison"}, {audio: 'audio/wordpool/BLACKBOARD.wav', word: "Blackboard"}, {audio: 'audio/wordpool/BLADE.wav', word: "Blade"}, {audio: 'audio/wordpool/BLENDER.wav', word: "Blender"},
        {audio: 'audio/wordpool/BLOCKADE.wav', word: "Blockade"}, {audio: 'audio/wordpool/BLOUSE.wav', word: "Blouse"}, {audio: 'audio/wordpool/BLUEPRINT.wav', word: "Blueprint"}, {audio: 'audio/wordpool/BODY.wav', word: "Body"}, {audio: 'audio/wordpool/BOUQUET.wav', word: "Bouquet"}, {audio: 'audio/wordpool/BOX.wav', word: "Box"}, {audio: 'audio/wordpool/BOYFRIEND.wav', word: "Boyfriend"}, {audio: 'audio/wordpool/BRACES.wav', word: "Braces"}, {audio: 'audio/wordpool/BRANCH.wav', word: "Branch"}, {audio: 'audio/wordpool/BRANDY.wav', word: "Brandy"}, {audio: 'audio/wordpool/BREAST.wav', word: "Breast"}, {audio: 'audio/wordpool/BRICK.wav', word: "Brick"}, {audio: 'audio/wordpool/BRIEFCASE.wav', word: "Briefcase"}, {audio: 'audio/wordpool/BROOK.wav', word: "Brook"}, {audio: 'audio/wordpool/BROTHER.wav', word: "Brother"}, {audio: 'audio/wordpool/BUBBLE.wav', word: "Bubble"}, {audio: 'audio/wordpool/BUCKET.wav', word: "Bucket"}, {audio: 'audio/wordpool/BUG.wav', word: "Bug"}, {audio: 'audio/wordpool/BUGGY.wav', word: "Buggy"}, {audio: 'audio/wordpool/BULLET.wav', word: "Bullet"},
        {audio: 'audio/wordpool/BUNNY.wav', word: "Bunny"}, {audio: 'audio/wordpool/BUREAU.wav', word: "Bureau"}, {audio: 'audio/wordpool/BURGLAR.wav', word: "Burglar"}, {audio: 'audio/wordpool/BUTCHER.wav', word: "Butcher"}, {audio: 'audio/wordpool/CABBAGE.wav', word: "Cabbage"}, {audio: 'audio/wordpool/CABIN.wav', word: "Cabin"}, {audio: 'audio/wordpool/CAFE.wav', word: "Cafe"}, {audio: 'audio/wordpool/CAMEL.wav', word: "Camel"}, {audio: 'audio/wordpool/CANAL.wav', word: "Canal"}, {audio: 'audio/wordpool/CANDY.wav', word: "Candy"}, {audio: 'audio/wordpool/CANYON.wav', word: "Canyon"}, {audio: 'audio/wordpool/CAPTIVE.wav', word: "Captive"}, {audio: 'audio/wordpool/CARRIAGE.wav', word: "Carriage"}, {audio: 'audio/wordpool/CARROT.wav', word: "Carrot"}, {audio: 'audio/wordpool/CASHEW.wav', word: "Cashew"}, {audio: 'audio/wordpool/CASHIER.wav', word: "Cashier"}, {audio: 'audio/wordpool/CASKET.wav', word: "Casket"}, {audio: 'audio/wordpool/CATCHER.wav', word: "Catcher"}, {audio: 'audio/wordpool/CATTLE.wav', word: "Cattle"}, {audio: 'audio/wordpool/CELLAR.wav', word: "Cellar"},
        {audio: 'audio/wordpool/CHAMPAGNE.wav', word: "Champagne"}, {audio: 'audio/wordpool/CHAPEL.wav', word: "Chapel"}, {audio: 'audio/wordpool/CHAUFFEUR.wav', word: "Chauffeur"}, {audio: 'audio/wordpool/CHEMIST.wav', word: "Chemist"}, {audio: 'audio/wordpool/CHEST.wav', word: "Chest"}, {audio: 'audio/wordpool/CHILD.wav', word: "Child"}, {audio: 'audio/wordpool/CHIPMUNK.wav', word: "Chipmunk"}, {audio: 'audio/wordpool/CHURCH.wav', word: "Church"}, {audio: 'audio/wordpool/CIGAR.wav', word: "Cigar"}, {audio: 'audio/wordpool/CITRUS.wav', word: "Citrus"}, {audio: 'audio/wordpool/CLAM.wav', word: "Clam"}, {audio: 'audio/wordpool/CLAMP.wav', word: "Clamp"}, {audio: 'audio/wordpool/CLIMBER.wav', word: "Climber"}, {audio: 'audio/wordpool/CLOCK.wav', word: "Clock"}, {audio: 'audio/wordpool/CLOTHES.wav', word: "Clothes"}, {audio: 'audio/wordpool/CLOUD.wav', word: "Cloud"}, {audio: 'audio/wordpool/COBRA.wav', word: "Cobra"}, {audio: 'audio/wordpool/COCKTAIL.wav', word: "Cocktail"}, {audio: 'audio/wordpool/COCOON.wav', word: "Cocoon"}, {audio: 'audio/wordpool/COD.wav', word: "Cod"},
        {audio: 'audio/wordpool/COFFEE.wav', word: "Coffee"}, {audio: 'audio/wordpool/COIN.wav', word: "Coin"}, {audio: 'audio/wordpool/COLLEGE.wav', word: "College"}, {audio: 'audio/wordpool/COMET.wav', word: "Comet"}, {audio: 'audio/wordpool/COMPASS.wav', word: "Compass"}, {audio: 'audio/wordpool/CONCERT.wav', word: "Concert"}, {audio: 'audio/wordpool/CONTRACT.wav', word: "Contract"}, {audio: 'audio/wordpool/CONVICT.wav', word: "Convict"}, {audio: 'audio/wordpool/COOK.wav', word: "Cook"}, {audio: 'audio/wordpool/COOKBOOK.wav', word: "Cookbook"}, {audio: 'audio/wordpool/COSTUME.wav', word: "Costume"}, {audio: 'audio/wordpool/COTTAGE.wav', word: "Cottage"}, {audio: 'audio/wordpool/COUCH.wav', word: "Couch"}, {audio: 'audio/wordpool/COUNTRY.wav', word: "Country"}, {audio: 'audio/wordpool/COUNTY.wav', word: "County"}, {audio: 'audio/wordpool/COUSIN.wav', word: "Cousin"}, {audio: 'audio/wordpool/COWBOY.wav', word: "Cowboy"}, {audio: 'audio/wordpool/CRAB.wav', word: "Crab"}, {audio: 'audio/wordpool/CRATER.wav', word: "Crater"}, {audio: 'audio/wordpool/CRAYON.wav', word: "Crayon"},
        {audio: 'audio/wordpool/CREATURE.wav', word: "Creature"}, {audio: 'audio/wordpool/CREVICE.wav', word: "Crevice"}, {audio: 'audio/wordpool/CRIB.wav', word: "Crib"}, {audio: 'audio/wordpool/CRICKET.wav', word: "Cricket"}, {audio: 'audio/wordpool/CRITIC.wav', word: "Critic"}, {audio: 'audio/wordpool/CROSS.wav', word: "Cross"}, {audio: 'audio/wordpool/CROWN.wav', word: "Crown"}, {audio: 'audio/wordpool/CRUTCH.wav', word: "Crutch"}, {audio: 'audio/wordpool/CUPBOARD.wav', word: "Cupboard"}, {audio: 'audio/wordpool/CURTAIN.wav', word: "Curtain"}, {audio: 'audio/wordpool/CUSTARD.wav', word: "Custard"}, {audio: 'audio/wordpool/CYCLONE.wav', word: "Cyclone"}, {audio: 'audio/wordpool/DAISY.wav', word: "Daisy"}, {audio: 'audio/wordpool/DANCER.wav', word: "Dancer"}, {audio: 'audio/wordpool/DANDRUFF.wav', word: "Dandruff"}, {audio: 'audio/wordpool/DASHBOARD.wav', word: "Dashboard"}, {audio: 'audio/wordpool/DAUGHTER.wav', word: "Daughter"}, {audio: 'audio/wordpool/DENIM.wav', word: "Denim"}, {audio: 'audio/wordpool/DENTIST.wav', word: "Dentist"}, {audio: 'audio/wordpool/DIME.wav', word: "Dime"},
        {audio: 'audio/wordpool/DINER.wav', word: "Diner"}, {audio: 'audio/wordpool/DIVER.wav', word: "Diver"}, {audio: 'audio/wordpool/DOLPHIN.wav', word: "Dolphin"}, {audio: 'audio/wordpool/DONKEY.wav', word: "Donkey"}, {audio: 'audio/wordpool/DONOR.wav', word: "Donor"}, {audio: 'audio/wordpool/DORM.wav', word: "Dorm"}, {audio: 'audio/wordpool/DOUGHNUT.wav', word: "Doughnut"}, {audio: 'audio/wordpool/DRAGON.wav', word: "Dragon"}, {audio: 'audio/wordpool/DRAWING.wav', word: "Drawing"}, {audio: 'audio/wordpool/DRESS.wav', word: "Dress"}, {audio: 'audio/wordpool/DRESSER.wav', word: "Dresser"}, {audio: 'audio/wordpool/DRILL.wav', word: "Drill"}, {audio: 'audio/wordpool/DRINK.wav', word: "Drink"}, {audio: 'audio/wordpool/DRIVER.wav', word: "Driver"}, {audio: 'audio/wordpool/DRUG.wav', word: "Drug"}, {audio: 'audio/wordpool/DUST.wav', word: "Dust"}, {audio: 'audio/wordpool/DUSTPAN.wav', word: "Dustpan"}, {audio: 'audio/wordpool/EAGLE.wav', word: "Eagle"}, {audio: 'audio/wordpool/EGYPT.wav', word: "Egypt"}, {audio: 'audio/wordpool/ELBOW.wav', word: "Elbow"},
        {audio: 'audio/wordpool/EMPIRE.wav', word: "Empire"}, {audio: 'audio/wordpool/EUROPE.wav', word: "Europe"}, {audio: 'audio/wordpool/EXPERT.wav', word: "Expert"}, {audio: 'audio/wordpool/EYELASH.wav', word: "Eyelash"}, {audio: 'audio/wordpool/FARMER.wav', word: "Farmer"}, {audio: 'audio/wordpool/FEMALE.wav', word: "Female"}, {audio: 'audio/wordpool/FIDDLE.wav', word: "Fiddle"}, {audio: 'audio/wordpool/FILM.wav', word: "Film"}, {audio: 'audio/wordpool/FINGER.wav', word: "Finger"}, {audio: 'audio/wordpool/FIREMAN.wav', word: "Fireman"}, {audio: 'audio/wordpool/FIREPLACE.wav', word: "Fireplace"}, {audio: 'audio/wordpool/FLAG.wav', word: "Flag"}, {audio: 'audio/wordpool/FLASHLIGHT.wav', word: "Flashlight"}, {audio: 'audio/wordpool/FLASK.wav', word: "Flask"}, {audio: 'audio/wordpool/FLEET.wav', word: "Fleet"}, {audio: 'audio/wordpool/FLESH.wav', word: "Flesh"}, {audio: 'audio/wordpool/FLIPPER.wav', word: "Flipper"}, {audio: 'audio/wordpool/FLOWER.wav', word: "Flower"}, {audio: 'audio/wordpool/FLUTE.wav', word: "Flute"}, {audio: 'audio/wordpool/FOOT.wav', word: "Foot"},
        {audio: 'audio/wordpool/FOOTBALL.wav', word: "Football"}, {audio: 'audio/wordpool/FOREHEAD.wav', word: "Forehead"}, {audio: 'audio/wordpool/FOREST.wav', word: "Forest"}, {audio: 'audio/wordpool/FOX.wav', word: "Fox"}, {audio: 'audio/wordpool/FRAGRANCE.wav', word: "Fragrance"}, {audio: 'audio/wordpool/FRAME.wav', word: "Frame"}, {audio: 'audio/wordpool/FRANCE.wav', word: "France"}, {audio: 'audio/wordpool/FRECKLE.wav', word: "Freckle"}, {audio: 'audio/wordpool/FREEZER.wav', word: "Freezer"}, {audio: 'audio/wordpool/FRIEND.wav', word: "Friend"}, {audio: 'audio/wordpool/FRUIT.wav', word: "Fruit"}, {audio: 'audio/wordpool/FUNGUS.wav', word: "Fungus"}, {audio: 'audio/wordpool/GALLON.wav', word: "Gallon"}, {audio: 'audio/wordpool/GANGSTER.wav', word: "Gangster"}, {audio: 'audio/wordpool/GARBAGE.wav', word: "Garbage"}, {audio: 'audio/wordpool/GARDEN.wav', word: "Garden"}, {audio: 'audio/wordpool/GARLIC.wav', word: "Garlic"}, {audio: 'audio/wordpool/GAVEL.wav', word: "Gavel"}, {audio: 'audio/wordpool/GAZELLE.wav', word: "Gazelle"}, {audio: 'audio/wordpool/GHETTO.wav', word: "Ghetto"},
        {audio: 'audio/wordpool/GIFT.wav', word: "Gift"}, {audio: 'audio/wordpool/GIRL.wav', word: "Girl"}, {audio: 'audio/wordpool/GLASS.wav', word: "Glass"}, {audio: 'audio/wordpool/GLOBE.wav', word: "Globe"}, {audio: 'audio/wordpool/GLOVE.wav', word: "Glove"}, {audio: 'audio/wordpool/GOBLIN.wav', word: "Goblin"}, {audio: 'audio/wordpool/GRAPE.wav', word: "Grape"}, {audio: 'audio/wordpool/GRAVE.wav', word: "Grave"}, {audio: 'audio/wordpool/GRAVEL.wav', word: "Gravel"}, {audio: 'audio/wordpool/GRILL.wav', word: "Grill"}, {audio: 'audio/wordpool/GROUND.wav', word: "Ground"}, {audio: 'audio/wordpool/GUARD.wav', word: "Guard"}, {audio: 'audio/wordpool/GUITAR.wav', word: "Guitar"}, {audio: 'audio/wordpool/GYMNAST.wav', word: "Gymnast"}, {audio: 'audio/wordpool/HAMPER.wav', word: "Hamper"}, {audio: 'audio/wordpool/HAND.wav', word: "Hand"}, {audio: 'audio/wordpool/HANDBAG.wav', word: "Handbag"}, {audio: 'audio/wordpool/HARP.wav', word: "Harp"}, {audio: 'audio/wordpool/HATCHET.wav', word: "Hatchet"}, {audio: 'audio/wordpool/HAWK.wav', word: "Hawk"},
        {audio: 'audio/wordpool/HEADBAND.wav', word: "Headband"}, {audio: 'audio/wordpool/HEART.wav', word: "Heart"}, {audio: 'audio/wordpool/HEDGE.wav', word: "Hedge"}, {audio: 'audio/wordpool/HELMET.wav', word: "Helmet"}, {audio: 'audio/wordpool/HERO.wav', word: "Hero"}, {audio: 'audio/wordpool/HIGHWAY.wav', word: "Highway"}, {audio: 'audio/wordpool/HIKER.wav', word: "Hiker"}, {audio: 'audio/wordpool/HONEY.wav', word: "Honey"}, {audio: 'audio/wordpool/HOOD.wav', word: "Hood"}, {audio: 'audio/wordpool/HOOK.wav', word: "Hook"}, {audio: 'audio/wordpool/HORNET.wav', word: "Hornet"}, {audio: 'audio/wordpool/HOSTESS.wav', word: "Hostess"}, {audio: 'audio/wordpool/HOUND.wav', word: "Hound"}, {audio: 'audio/wordpool/HUMAN.wav', word: "Human"}, {audio: 'audio/wordpool/HUSBAND.wav', word: "Husband"}, {audio: 'audio/wordpool/ICEBERG.wav', word: "Iceberg"}, {audio: 'audio/wordpool/ICING.wav', word: "Icing"}, {audio: 'audio/wordpool/IGLOO.wav', word: "Igloo"}, {audio: 'audio/wordpool/INFANT.wav', word: "Infant"}, {audio: 'audio/wordpool/INMATE.wav', word: "Inmate"},
        {audio: 'audio/wordpool/ISLAND.wav', word: "Island"}, {audio: 'audio/wordpool/ITEM.wav', word: "Item"}, {audio: 'audio/wordpool/JAPAN.wav', word: "Japan"}, {audio: 'audio/wordpool/JELLO.wav', word: "Jello"}, {audio: 'audio/wordpool/JELLY.wav', word: "Jelly"}, {audio: 'audio/wordpool/JOURNAL.wav', word: "Journal"}, {audio: 'audio/wordpool/JUDGE.wav', word: "Judge"}, {audio: 'audio/wordpool/JUGGLER.wav', word: "Juggler"}, {audio: 'audio/wordpool/JUNGLE.wav', word: "Jungle"}, {audio: 'audio/wordpool/JURY.wav', word: "Jury"}, {audio: 'audio/wordpool/KEEPER.wav', word: "Keeper"}, {audio: 'audio/wordpool/KETCHUP.wav', word: "Ketchup"}, {audio: 'audio/wordpool/KIDNEY.wav', word: "Kidney"}, {audio: 'audio/wordpool/KITCHEN.wav', word: "Kitchen"}, {audio: 'audio/wordpool/KLEENEX.wav', word: "Kleenex"}, {audio: 'audio/wordpool/KNAPSACK.wav', word: "Knapsack"}, {audio: 'audio/wordpool/KNIFE.wav', word: "Knife"}, {audio: 'audio/wordpool/LABEL.wav', word: "Label"}, {audio: 'audio/wordpool/LACE.wav', word: "Lace"}, {audio: 'audio/wordpool/LADY.wav', word: "Lady"},
        {audio: 'audio/wordpool/LAGOON.wav', word: "Lagoon"}, {audio: 'audio/wordpool/LAKE.wav', word: "Lake"}, {audio: 'audio/wordpool/LAMP.wav', word: "Lamp"}, {audio: 'audio/wordpool/LAPEL.wav', word: "Lapel"}, {audio: 'audio/wordpool/LASER.wav', word: "Laser"}, {audio: 'audio/wordpool/LAVA.wav', word: "Lava"}, {audio: 'audio/wordpool/LEADER.wav', word: "Leader"}, {audio: 'audio/wordpool/LEG.wav', word: "Leg"}, {audio: 'audio/wordpool/LEOPARD.wav', word: "Leopard"}, {audio: 'audio/wordpool/LETTUCE.wav', word: "Lettuce"}, {audio: 'audio/wordpool/LIGHTNING.wav', word: "Lightning"}, {audio: 'audio/wordpool/LILY.wav', word: "Lily"}, {audio: 'audio/wordpool/LION.wav', word: "Lion"}, {audio: 'audio/wordpool/LIPSTICK.wav', word: "Lipstick"}, {audio: 'audio/wordpool/LIVER.wav', word: "Liver"}, {audio: 'audio/wordpool/LIZARD.wav', word: "Lizard"}, {audio: 'audio/wordpool/LODGE.wav', word: "Lodge"}, {audio: 'audio/wordpool/LOFT.wav', word: "Loft"}, {audio: 'audio/wordpool/LONDON.wav', word: "London"}, {audio: 'audio/wordpool/LOVER.wav', word: "Lover"},
        {audio: 'audio/wordpool/LUGGAGE.wav', word: "Luggage"}, {audio: 'audio/wordpool/LUMBER.wav', word: "Lumber"}, {audio: 'audio/wordpool/LUNCH.wav', word: "Lunch"}, {audio: 'audio/wordpool/MACHINE.wav', word: "Machine"}, {audio: 'audio/wordpool/MAILBOX.wav', word: "Mailbox"}, {audio: 'audio/wordpool/MAILMAN.wav', word: "Mailman"}, {audio: 'audio/wordpool/MAMMAL.wav', word: "Mammal"}, {audio: 'audio/wordpool/MAPLE.wav', word: "Maple"}, {audio: 'audio/wordpool/MARINE.wav', word: "Marine"}, {audio: 'audio/wordpool/MARKER.wav', word: "Marker"}, {audio: 'audio/wordpool/MARKET.wav', word: "Market"}, {audio: 'audio/wordpool/MARROW.wav', word: "Marrow"}, {audio: 'audio/wordpool/MARS.wav', word: "Mars"}, {audio: 'audio/wordpool/MARSH.wav', word: "Marsh"}, {audio: 'audio/wordpool/MASK.wav', word: "Mask"}, {audio: 'audio/wordpool/MATCH.wav', word: "Match"}, {audio: 'audio/wordpool/MATTRESS.wav', word: "Mattress"}, {audio: 'audio/wordpool/MESSAGE.wav', word: "Message"}, {audio: 'audio/wordpool/MILDEW.wav', word: "Mildew"}, {audio: 'audio/wordpool/MILK.wav', word: "Milk"},
        {audio: 'audio/wordpool/MISSILE.wav', word: "Missile"}, {audio: 'audio/wordpool/MISTER.wav', word: "Mister"}, {audio: 'audio/wordpool/MONEY.wav', word: "Money"}, {audio: 'audio/wordpool/MONSTER.wav', word: "Monster"}, {audio: 'audio/wordpool/MOP.wav', word: "Mop"}, {audio: 'audio/wordpool/MOTEL.wav', word: "Motel"}, {audio: 'audio/wordpool/MOTOR.wav', word: "Motor"}, {audio: 'audio/wordpool/MUFFIN.wav', word: "Muffin"}, {audio: 'audio/wordpool/MUMMY.wav', word: "Mummy"}, {audio: 'audio/wordpool/MUSTARD.wav', word: "Mustard"}, {audio: 'audio/wordpool/NAPKIN.wav', word: "Napkin"}, {audio: 'audio/wordpool/NECKLACE.wav', word: "Necklace"}, {audio: 'audio/wordpool/NEUTRON.wav', word: "Neutron"}, {audio: 'audio/wordpool/NIGHTGOWN.wav', word: "Nightgown"}, {audio: 'audio/wordpool/NOMAD.wav', word: "Nomad"}, {audio: 'audio/wordpool/NOTEBOOK.wav', word: "Notebook"}, {audio: 'audio/wordpool/NOVEL.wav', word: "Novel"}, {audio: 'audio/wordpool/NURSE.wav', word: "Nurse"}, {audio: 'audio/wordpool/OFFICE.wav', word: "Office"}, {audio: 'audio/wordpool/OINTMENT.wav', word: "Ointment"},
        {audio: 'audio/wordpool/OMELET.wav', word: "Omelet"}, {audio: 'audio/wordpool/ONION.wav', word: "Onion"}, {audio: 'audio/wordpool/ORANGE.wav', word: "Orange"}, {audio: 'audio/wordpool/ORCHID.wav', word: "Orchid"}, {audio: 'audio/wordpool/OUTDOORS.wav', word: "Outdoors"}, {audio: 'audio/wordpool/OUTFIT.wav', word: "Outfit"}, {audio: 'audio/wordpool/OUTLAW.wav', word: "Outlaw"}, {audio: 'audio/wordpool/OX.wav', word: "Ox"}, {audio: 'audio/wordpool/OYSTER.wav', word: "Oyster"}, {audio: 'audio/wordpool/OZONE.wav', word: "Ozone"}, {audio: 'audio/wordpool/PACKAGE.wav', word: "Package"}, {audio: 'audio/wordpool/PADDING.wav', word: "Padding"}, {audio: 'audio/wordpool/PADDLE.wav', word: "Paddle"}, {audio: 'audio/wordpool/PALACE.wav', word: "Palace"}, {audio: 'audio/wordpool/PANTHER.wav', word: "Panther"}, {audio: 'audio/wordpool/PAPER.wav', word: "Paper"}, {audio: 'audio/wordpool/PARENT.wav', word: "Parent"}, {audio: 'audio/wordpool/PARROT.wav', word: "Parrot"}, {audio: 'audio/wordpool/PARSLEY.wav', word: "Parsley"}, {audio: 'audio/wordpool/PARTNER.wav', word: "Partner"},
        {audio: 'audio/wordpool/PASSAGE.wav', word: "Passage"}, {audio: 'audio/wordpool/PASTA.wav', word: "Pasta"}, {audio: 'audio/wordpool/PASTRY.wav', word: "Pastry"}, {audio: 'audio/wordpool/PATIENT.wav', word: "Patient"}, {audio: 'audio/wordpool/PATROL.wav', word: "Patrol"}, {audio: 'audio/wordpool/PEACH.wav', word: "Peach"}, {audio: 'audio/wordpool/PEANUT.wav', word: "Peanut"}, {audio: 'audio/wordpool/PEBBLE.wav', word: "Pebble"}, {audio: 'audio/wordpool/PECAN.wav', word: "Pecan"}, {audio: 'audio/wordpool/PENGUIN.wav', word: "Penguin"}, {audio: 'audio/wordpool/PEPPER.wav', word: "Pepper"}, {audio: 'audio/wordpool/PERCH.wav', word: "Perch"}, {audio: 'audio/wordpool/PERFUME.wav', word: "Perfume"}, {audio: 'audio/wordpool/PERMIT.wav', word: "Permit"}, {audio: 'audio/wordpool/PIANO.wav', word: "Piano"}, {audio: 'audio/wordpool/PICNIC.wav', word: "Picnic"}, {audio: 'audio/wordpool/PICTURE.wav', word: "Picture"}, {audio: 'audio/wordpool/PIGEON.wav', word: "Pigeon"}, {audio: 'audio/wordpool/PIGMENT.wav', word: "Pigment"}, {audio: 'audio/wordpool/PILOT.wav', word: "Pilot"},
        {audio: 'audio/wordpool/PIMPLE.wav', word: "Pimple"}, {audio: 'audio/wordpool/PISTOL.wav', word: "Pistol"}, {audio: 'audio/wordpool/PISTON.wav', word: "Piston"}, {audio: 'audio/wordpool/PIZZA.wav', word: "Pizza"}, {audio: 'audio/wordpool/PLAID.wav', word: "Plaid"}, {audio: 'audio/wordpool/PLASTER.wav', word: "Plaster"}, {audio: 'audio/wordpool/PLATE.wav', word: "Plate"}, {audio: 'audio/wordpool/PLAYGROUND.wav', word: "Playground"}, {audio: 'audio/wordpool/PLAZA.wav', word: "Plaza"}, {audio: 'audio/wordpool/PLIERS.wav', word: "Pliers"}, {audio: 'audio/wordpool/PLUTO.wav', word: "Pluto"}, {audio: 'audio/wordpool/POCKET.wav', word: "Pocket"}, {audio: 'audio/wordpool/POET.wav', word: "Poet"}, {audio: 'audio/wordpool/POISON.wav', word: "Poison"}, {audio: 'audio/wordpool/POLICE.wav', word: "Police"}, {audio: 'audio/wordpool/POPCORN.wav', word: "Popcorn"}, {audio: 'audio/wordpool/PORK.wav', word: "Pork"}, {audio: 'audio/wordpool/PORTRAIT.wav', word: "Portrait"}, {audio: 'audio/wordpool/POSSUM.wav', word: "Possum"}, {audio: 'audio/wordpool/POSTAGE.wav', word: "Postage"},
        {audio: 'audio/wordpool/POWDER.wav', word: "Powder"}, {audio: 'audio/wordpool/PREACHER.wav', word: "Preacher"}, {audio: 'audio/wordpool/PRIMATE.wav', word: "Primate"}, {audio: 'audio/wordpool/PRINCESS.wav', word: "Princess"}, {audio: 'audio/wordpool/PROTON.wav', word: "Proton"}, {audio: 'audio/wordpool/PUDDING.wav', word: "Pudding"}, {audio: 'audio/wordpool/PUDDLE.wav', word: "Puddle"}, {audio: 'audio/wordpool/PUPPY.wav', word: "Puppy"}, {audio: 'audio/wordpool/QUAIL.wav', word: "Quail"}, {audio: 'audio/wordpool/QUARTER.wav', word: "Quarter"}, {audio: 'audio/wordpool/QUEEN.wav', word: "Queen"}, {audio: 'audio/wordpool/RABBIT.wav', word: "Rabbit"}, {audio: 'audio/wordpool/RACKET.wav', word: "Racket"}, {audio: 'audio/wordpool/RADISH.wav', word: "Radish"}, {audio: 'audio/wordpool/RAFT.wav', word: "Raft"}, {audio: 'audio/wordpool/RATTLE.wav', word: "Rattle"}, {audio: 'audio/wordpool/RAZOR.wav', word: "Razor"}, {audio: 'audio/wordpool/REBEL.wav', word: "Rebel"}, {audio: 'audio/wordpool/RECEIPT.wav', word: "Receipt"}, {audio: 'audio/wordpool/RECORD.wav', word: "Record"},
        {audio: 'audio/wordpool/RELISH.wav', word: "Relish"}, {audio: 'audio/wordpool/REPORT.wav', word: "Report"}, {audio: 'audio/wordpool/RIFLE.wav', word: "Rifle"}, {audio: 'audio/wordpool/RIVER.wav', word: "River"}, {audio: 'audio/wordpool/ROBBER.wav', word: "Robber"}, {audio: 'audio/wordpool/ROBIN.wav', word: "Robin"}, {audio: 'audio/wordpool/ROBOT.wav', word: "Robot"}, {audio: 'audio/wordpool/ROCKET.wav', word: "Rocket"}, {audio: 'audio/wordpool/ROD.wav', word: "Rod"}, {audio: 'audio/wordpool/ROOSTER.wav', word: "Rooster"}, {audio: 'audio/wordpool/RUG.wav', word: "Rug"}, {audio: 'audio/wordpool/RUST.wav', word: "Rust"}, {audio: 'audio/wordpool/SADDLE.wav', word: "Saddle"}, {audio: 'audio/wordpool/SALAD.wav', word: "Salad"}, {audio: 'audio/wordpool/SALMON.wav', word: "Salmon"}, {audio: 'audio/wordpool/SALT.wav', word: "Salt"}, {audio: 'audio/wordpool/SANDWICH.wav', word: "Sandwich"}, {audio: 'audio/wordpool/SAUSAGE.wav', word: "Sausage"}, {audio: 'audio/wordpool/SCALLOP.wav', word: "Scallop"}, {audio: 'audio/wordpool/SCALPEL.wav', word: "Scalpel"},
        {audio: 'audio/wordpool/SCARECROW.wav', word: "Scarecrow"}, {audio: 'audio/wordpool/SCARF.wav', word: "Scarf"}, {audio: 'audio/wordpool/SCISSORS.wav', word: "Scissors"}, {audio: 'audio/wordpool/SCOTCH.wav', word: "Scotch"}, {audio: 'audio/wordpool/SCRIBBLE.wav', word: "Scribble"}, {audio: 'audio/wordpool/SCULPTURE.wav', word: "Sculpture"}, {audio: 'audio/wordpool/SEAFOOD.wav', word: "Seafood"}, {audio: 'audio/wordpool/SEAGULL.wav', word: "Seagull"}, {audio: 'audio/wordpool/SEAL.wav', word: "Seal"}, {audio: 'audio/wordpool/SERVANT.wav', word: "Servant"}, {audio: 'audio/wordpool/SERVER.wav', word: "Server"}, {audio: 'audio/wordpool/SHARK.wav', word: "Shark"}, {audio: 'audio/wordpool/SHELF.wav', word: "Shelf"}, {audio: 'audio/wordpool/SHELTER.wav', word: "Shelter"}, {audio: 'audio/wordpool/SHERIFF.wav', word: "Sheriff"}, {audio: 'audio/wordpool/SHIRT.wav', word: "Shirt"}, {audio: 'audio/wordpool/SHORTCAKE.wav', word: "Shortcake"}, {audio: 'audio/wordpool/SHORTS.wav', word: "Shorts"}, {audio: 'audio/wordpool/SHOULDER.wav', word: "Shoulder"}, {audio: 'audio/wordpool/SHOVEL.wav', word: "Shovel"},
        {audio: 'audio/wordpool/SHRUB.wav', word: "Shrub"}, {audio: 'audio/wordpool/SIBLING.wav', word: "Sibling"}, {audio: 'audio/wordpool/SIDEWALK.wav', word: "Sidewalk"}, {audio: 'audio/wordpool/SILK.wav', word: "Silk"}, {audio: 'audio/wordpool/SISTER.wav', word: "Sister"}, {audio: 'audio/wordpool/SKETCH.wav', word: "Sketch"}, {audio: 'audio/wordpool/SKILLET.wav', word: "Skillet"}, {audio: 'audio/wordpool/SKIRT.wav', word: "Skirt"}, {audio: 'audio/wordpool/SLIDE.wav', word: "Slide"}, {audio: 'audio/wordpool/SLIME.wav', word: "Slime"}, {audio: 'audio/wordpool/SLOPE.wav', word: "Slope"}, {audio: 'audio/wordpool/SLUG.wav', word: "Slug"}, {audio: 'audio/wordpool/SMOG.wav', word: "Smog"}, {audio: 'audio/wordpool/SNACK.wav', word: "Snack"}, {audio: 'audio/wordpool/SNAIL.wav', word: "Snail"}, {audio: 'audio/wordpool/SNAKE.wav', word: "Snake"}, {audio: 'audio/wordpool/SODA.wav', word: "Soda"}, {audio: 'audio/wordpool/SOFTBALL.wav', word: "Softball"}, {audio: 'audio/wordpool/SPACE.wav', word: "Space"}, {audio: 'audio/wordpool/SPARROW.wav', word: "Sparrow"},
        {audio: 'audio/wordpool/SPHINX.wav', word: "Sphinx"}, {audio: 'audio/wordpool/SPIDER.wav', word: "Spider"}, {audio: 'audio/wordpool/SPONGE.wav', word: "Sponge"}, {audio: 'audio/wordpool/SPOOL.wav', word: "Spool"}, {audio: 'audio/wordpool/SPOON.wav', word: "Spoon"}, {audio: 'audio/wordpool/SPOUSE.wav', word: "Spouse"}, {audio: 'audio/wordpool/STALLION.wav', word: "Stallion"}, {audio: 'audio/wordpool/STAMP.wav', word: "Stamp"}, {audio: 'audio/wordpool/STAPLE.wav', word: "Staple"}, {audio: 'audio/wordpool/STAR.wav', word: "Star"}, {audio: 'audio/wordpool/STATUE.wav', word: "Statue"}, {audio: 'audio/wordpool/STICKER.wav', word: "Sticker"}, {audio: 'audio/wordpool/STOMACH.wav', word: "Stomach"}, {audio: 'audio/wordpool/STONE.wav', word: "Stone"}, {audio: 'audio/wordpool/STOVE.wav', word: "Stove"}, {audio: 'audio/wordpool/STREAM.wav', word: "Stream"}, {audio: 'audio/wordpool/STUDENT.wav', word: "Student"}, {audio: 'audio/wordpool/SUBWAY.wav', word: "Subway"}, {audio: 'audio/wordpool/SUITCASE.wav', word: "Suitcase"}, {audio: 'audio/wordpool/SUMMIT.wav', word: "Summit"},
        {audio: 'audio/wordpool/SUNRISE.wav', word: "Sunrise"}, {audio: 'audio/wordpool/SUNSET.wav', word: "Sunset"}, {audio: 'audio/wordpool/SUPPER.wav', word: "Supper"}, {audio: 'audio/wordpool/SURVEY.wav', word: "Survey"}, {audio: 'audio/wordpool/SUSPECT.wav', word: "Suspect"}, {audio: 'audio/wordpool/SWAMP.wav', word: "Swamp"}, {audio: 'audio/wordpool/SWIMMER.wav', word: "Swimmer"}, {audio: 'audio/wordpool/SWITCH.wav', word: "Switch"}, {audio: 'audio/wordpool/SWORD.wav', word: "Sword"}, {audio: 'audio/wordpool/TABLE.wav', word: "Table"}, {audio: 'audio/wordpool/TABLET.wav', word: "Tablet"}, {audio: 'audio/wordpool/TART.wav', word: "Tart"}, {audio: 'audio/wordpool/TAXI.wav', word: "Taxi"}, {audio: 'audio/wordpool/TEACHER.wav', word: "Teacher"}, {audio: 'audio/wordpool/TEMPLE.wav', word: "Temple"}, {audio: 'audio/wordpool/TERMITE.wav', word: "Termite"}, {audio: 'audio/wordpool/THIEF.wav', word: "Thief"}, {audio: 'audio/wordpool/THREAD.wav', word: "Thread"}, {audio: 'audio/wordpool/TILE.wav', word: "Tile"}, {audio: 'audio/wordpool/TOASTER.wav', word: "Toaster"},
        {audio: 'audio/wordpool/TOMBSTONE.wav', word: "Tombstone"}, {audio: 'audio/wordpool/TORTOISE.wav', word: "Tortoise"}, {audio: 'audio/wordpool/TOURIST.wav', word: "Tourist"}, {audio: 'audio/wordpool/TRACTOR.wav', word: "Tractor"}, {audio: 'audio/wordpool/TRANSPLANT.wav', word: "Transplant"}, {audio: 'audio/wordpool/TREAT.wav', word: "Treat"}, {audio: 'audio/wordpool/TRENCH.wav', word: "Trench"}, {audio: 'audio/wordpool/TRIBE.wav', word: "Tribe"}, {audio: 'audio/wordpool/TROMBONE.wav', word: "Trombone"}, {audio: 'audio/wordpool/TROUT.wav', word: "Trout"}, {audio: 'audio/wordpool/TRUCK.wav', word: "Truck"}, {audio: 'audio/wordpool/TUBA.wav', word: "Tuba"}, {audio: 'audio/wordpool/TUNNEL.wav', word: "Tunnel"}, {audio: 'audio/wordpool/TURKEY.wav', word: "Turkey"}, {audio: 'audio/wordpool/TURNIP.wav', word: "Turnip"}, {audio: 'audio/wordpool/TURTLE.wav', word: "Turtle"}, {audio: 'audio/wordpool/TUTU.wav', word: "Tutu"}, {audio: 'audio/wordpool/TWEEZERS.wav', word: "Tweezers"}, {audio: 'audio/wordpool/TWIG.wav', word: "Twig"}, {audio: 'audio/wordpool/TWISTER.wav', word: "Twister"},
        {audio: 'audio/wordpool/TYPIST.wav', word: "Typist"}, {audio: 'audio/wordpool/ULCER.wav', word: "Ulcer"}, {audio: 'audio/wordpool/UMPIRE.wav', word: "Umpire"}, {audio: 'audio/wordpool/UNCLE.wav', word: "Uncle"}, {audio: 'audio/wordpool/VAGRANT.wav', word: "vagrant"}, {audio: 'audio/wordpool/VALLEY.wav', word: "Valley"}, {audio: 'audio/wordpool/VALVE.wav', word: "Valve"}, {audio: 'audio/wordpool/VELVET.wav', word: "Velvet"}, {audio: 'audio/wordpool/VENUS.wav', word: "Venus"}, {audio: 'audio/wordpool/VICTIM.wav', word: "Victim"}, {audio: 'audio/wordpool/VIKING.wav', word: "Viking"}, {audio: 'audio/wordpool/VIRUS.wav', word: "Virus"}, {audio: 'audio/wordpool/WAGON.wav', word: "Wagon"}, {audio: 'audio/wordpool/WAITER.wav', word: "Waiter"}, {audio: 'audio/wordpool/WAITRESS.wav', word: "Waitress"}, {audio: 'audio/wordpool/WARDROBE.wav', word: "Wardrobe"}, {audio: 'audio/wordpool/WASHER.wav', word: "Washer"}, {audio: 'audio/wordpool/WASP.wav', word: "Wasp"}, {audio: 'audio/wordpool/WHISKERS.wav', word: "Whiskers"}, {audio: 'audio/wordpool/WHISTLE.wav', word: "Whistle"},
        {audio: 'audio/wordpool/WIDOW.wav', word: "Widow"}, {audio: 'audio/wordpool/WIFE.wav', word: "Wife"}, {audio: 'audio/wordpool/WINDOW.wav', word: "Window"}, {audio: 'audio/wordpool/WITNESS.wav', word: "Witness"}, {audio: 'audio/wordpool/WOMAN.wav', word: "Woman"}, {audio: 'audio/wordpool/WORKER.wav', word: 'Worker'}, {audio: 'audio/wordpool/WORLD.wav', word: "World"}, {audio: 'audio/wordpool/WRENCH.wav', word: "Wrench"}, {audio: 'audio/wordpool/WRIST.wav', word: "Wrist"}, {audio: 'audio/wordpool/XEROX.wav', word: "Xerox"}, {audio: 'audio/wordpool/YACHT.wav', word: "Yacht"}, {audio: 'audio/wordpool/YARN.wav', word: "Yarn"}, {audio: 'audio/wordpool/ZEBRA.wav', word: "Zebra"}, {audio: 'audio/wordpool/ZIPPER.wav', word: "Zipper"}
    ]

    //randomize /static/audio/wordpool
    var timeline_variables = jsPsych.randomization.shuffle(wordpool);

    //ensure not to repeat words from wordpool
    var position = [];
    for(var i = 0; i < list_length; i++){
        position.push(i - list_length)
    };

    // attention check... give list of 5 words, they have to correctly recall 3 to continue with experiment
    var att_instructions = {
        type: "html-keyboard-response",
        stimulus: '<p>You will now hear a practice list of words and be asked to recall them.  This will prepare you for the rest of the experiment.</p>\
        <p>Press any key to start the practice round.</p>',
        post_trial_gap: 1500
    };
    timeline.push(att_instructions);

    timeline.push(sound_tone);

    var play_attention = {
        type: "audio-keyboard-response",
        stimulus: jsPsych.timelineVariable('audio'),
        trial_duration: presentation_rate,
        choices: jsPsych.NO_KEYS,
        data: function(){
            return {word: jsPsych.timelineVariable('word').toLowerCase(), type: 'ATT_WORD'}
        }
    };

    // array of words presented during attention check
    var att_list = [];

    // present attention check words
    var att_pres = {
        timeline: [play_attention],
        timeline_variables: timeline_variables,
        sample: {
            type: 'custom',
            fn: function(){
                wpool_len = timeline_variables.length;    // should be 554... pick words 550 - 554
                att_arr = []
                for(var w = wpool_len - 5; w < wpool_len; w++){
                    att_arr.push(w)
                };
                return att_arr;
            }
        },
        on_finish: function(data) {
            att_list.push(jsPsych.data.getLastTrialData().values()[0].word.toLowerCase())
        }
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
        jsPsych.finishTrial({response: {Q0: "null"}, rt: null});
        att_time_left = false;
    }
    function end_att_recall() {
        setTimeout(att_recall_over, att_recall_length);
    }

    var att_recall_timer = {
        type: 'call-function',
        func: end_att_recall,
    };

    var att_recall = {
        type: 'survey-text',
        questions: [
            {prompt: function() {
                var direction = (initiation_condition == "primacy") ? "<b>beginning</b>" : "<b>end</b>";
                return "<p>Recall the words you just heard. You MUST begin recall with a word from the " + direction + " of the list.</p>";
            }}
        ],
        post_trial_gap: 1,
        data: function(){ return {type: 'ATT_REC'} },
        on_finish: function(data){
            var att_recalled = ((data.response && data.response.Q0) ? data.response.Q0 : "").toString().toLowerCase();
            var serial_pos = att_list.indexOf(att_recalled) + 1;
            if (att_list.indexOf(att_recalled) > -1){
                att_correct++;
            };
            if (!first_recall_checked){
                first_recall_checked = true;
                if (initiation_condition == "primacy") {
                    started_correctly = (serial_pos >= 1 && serial_pos <= 3);
                } else {
                    started_correctly = (serial_pos >= 3 && serial_pos <= 5);
                }
            }
            att_trials++;
        }
    };
    
    var att_rec_period = {
        timeline: [att_recall],
        loop_function: function(){
            if(att_trials < 5 && att_time_left){
                return true;
            } else {
                return false;
            }
        }
    };
    timeline.push(att_recall_timer);
    timeline.push(att_rec_period);

    // if 3 or more words correctly recalled, continue with experiment 
    // if 2 correct recalls, warn that poor attention will not qualify for more lucrative follow up
    // if less than 2 recalls, kick out
    var pass_att = {
        type: 'html-keyboard-response',
        stimulus: "<p>Well done. You have passed the attention check. Press any key to continue.</p>"
    };

    var cont_att = {
        type: 'html-button-response',
        stimulus: '<p>Please try to pay your best attention.  Remember that paying attention and giving your \
        best effort can qualify you for more lucrative follow up studies!</p> \
        <p>When you are ready and attentive, press Continue to proceed.</p>',
        choices: ["Continue"]
    };

    var fail_att = {
        type: 'html-keyboard-response',
        response_ends_trial: false,
        stimulus: "<p>The preceding questions were designed to screen participants who are not carefully following the instructions of our study.</p> \
        <p>Please do not reload the page.</p> \
        <p>Based on your responses to these questions, we ask that you return this HIT to Prolific at this time.</p>",
        choices: jsPsych.NO_KEYS,
        trial_duration: 3000,
        on_finish: function() {
            jsPsych.endExperiment("Please return this study to Prolific.");
        }
    };

    var pass_node = {
        timeline: [pass_att],
        conditional_function: function(){
            if (att_correct >= 3 && started_correctly){
                return true;
            } else {
                return false;
            }
        }
    };
    timeline.push(pass_node);

    var cont_node = {
        timeline: [cont_att],
        conditional_function: function(){
            if (att_correct == 2 && started_correctly){
                return true;
            } else {
                return false;
            }
        }
    };
    timeline.push(cont_node);

    var fail_node = {
        timeline: [fail_att],
        conditional_function: function(){
            if (att_correct < 2 || !started_correctly){
                return true;
            } else {
                return false;
            }
        }
    };
    timeline.push(fail_node);

    var start_experiment = {
        type: 'html-button-response',
        stimulus: '<p>You are ready for the first list of words!</p><p>Press Start to proceed.</p>',
        choices: ["Start"],
        post_trial_gap: 1000,
    }
    timeline.push(start_experiment);

    var hold_keys_instructions = {
        type: 'html-keyboard-response',
        stimulus: '<p>In order for the audio to play, please hold down both the <b>A</b> and <b>L</b> keys on your keyboard.</p> \
        <p>You will keep these keys held down as each list of words is played, and then you may remove them when it is time to \
        type your response.</p><p>Hold <b>A</b> and <b>L</b> to hear the list.</p>',
        trial_duration: 15000,
        choices: ['a', 'l'],
        response_ends_trial: true,
        post_trial_gap: 1500
    };

    //serial position of presented word
    var srpos = 0;
    //current list number (0-19)
    var curr_list = 0;

    var play_word = {
        type: "audio-keyboard-response",
        stimulus: jsPsych.timelineVariable('audio'),
        trial_duration: presentation_rate,
        choices: jsPsych.NO_KEYS,
        data: function(){
            srpos++;
            return {word: jsPsych.timelineVariable('word').toLowerCase(), serial_position: srpos, type: 'WORD', list: curr_list}
        }
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
            type: 'custom',
            fn: function(){
                position = position.map(n => n + list_length);
                return position
            }
        },
        on_finish: function(data){
            arr_list.push(jsPsych.data.getLastTrialData().values()[0].word.toLowerCase());
        }
    };

    //recall instructions appear before first recall period
    var recall_instructions = {
        type: "html-button-response",
        stimulus: function() {
            if (initiation_condition == "primacy"){
                return "<p>You will now have 90 seconds to recall the words. You MUST begin recall with a word from the <b>beginning</b> of the list.</p><p>After your first response, recall in any order.</p><p>Type into the box and press the Enter key for each word.</p><p>Press the Start Recall button to begin recall.</p>";
            } if (initiation_condition == "recency"){
                return "<p>You will now have 90 seconds to recall the words. You MUST begin recall with a word from the <b>end</b> of the list.</p><p>After your first response, recall in any order.</p><p>Type into the box and press the Enter key for each word.</p><p>Press the Start Recall button to begin recall.</p>";
            }},
        choices: ["Start Recall"],
        post_trial_gap: 500
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
            {prompt: "<p>Recall the words from the list you just heard.</p><p> Press the Enter key or the Continue button to submit each word.</p>"}
        ],
        post_trial_gap: 1,
        data: function(){
            return {type: 'REC_WORD', list: curr_list}
        },
        on_finish: function(data){
            var recalled = ((data.response && data.response.Q0) ? data.response.Q0 : "null").toString().toLowerCase();
            if(recalled == 'null'){
                data.serial_position = 99;
            } else {
                data.serial_position = 88;
            }
            for(var j = 0; j < arr_list.length; j++){
                if(recalled == arr_list[j]){
                    data.serial_position = j + 1;
                }
            }
            data.recall_position = rec_words.length + 1;
            data.is_first_recall = (rec_words.length === 0);
            data.rec_word = recalled;
            rec_words.push(recalled)
            rts.push(data.rt);
        }
    };

    //recall trials loop so long as there is time left (still within the 90s recall period)
    var recall_period = {
        timeline: [free_recall],
        loop_function: function(){
            if(time_left == true){
                return true;
            } else {
                return false;
            }
        }
    };

    //recall timeout after 90s
    var recall_length = 90000;
    function recall_over(){
        jsPsych.finishTrial({response: {Q0: "null"}, rt: null});
        return time_left = false;
    };

    function end_recall() {
        setTimeout(recall_over, recall_length)
    };

    var recall_timer = {
        type: 'call-function',
        func: end_recall
    };

    //page that prompts participant to move onto next list, resets variables, empties arrays
    var ready = {
        type: "html-button-response",
        stimulus: "Press the Ready button when you are ready for the next list of words.",
        choices: ["Ready"],
        post_trial_gap: 1000,
        on_finish: function(data){
            srpos = 0;
            srposR = 88;
            time_left = true;
            arr_list = [];
            rec_words = [];
            rts = [];
            curr_list++;
        }
    };

    // notes
    var notes = {
        type: 'html-button-response',
        stimulus:"<p class = inst>Did you write notes during this session?</p>",
        choices: ['Yes', 'No'],
        on_finish: function(data){
            var resp = data.response;
            if(resp == 0){
                data.notes = true;       // subject took notes
            } else {
                data.notes = false;      // subject didn't take notes
            };
        }
    };

    var final_page = {
        type: "html-keyboard-response",
        stimulus: "Thank you for participating in the experiment.",
        choices: jsPsych.NO_KEYS,
        trial_duration: 3500
    };

    var save_data_node = {
        type: "call-function",
        async: true,
        func: function(done) {
            jsPsych.data.addProperties({
                l_length: list_length,
                pres_rate: presentation_rate,
                num_lists: num_lists,
                session: 3,
                replays: tot_replays,
                prolific_pid: prolific_pid,
                study_id: study_id,
                session_id: session_id,
                initiation_condition: initiation_condition
            });
    
            saveData()
                .then(function(response) {
                    if (!response.ok) {
                        throw new Error("Save failed");
                    }
                    done({ save_success: true });
                })
                .catch(function(error) {
                    console.error(error);
                    done({ save_success: false });
                });
        }
    };
    
    var save_failed_page = {
        type: "html-button-response",
        stimulus: "<p>Oops! Your data could not be saved.</p><p>Please do not close this page. Press the button below to try again.</p>",
        choices: ["Try Again"]
    };
    
    var save_failed_node = {
        timeline: [save_failed_page, save_data_node],
        conditional_function: function() {
            var last = jsPsych.data.get().last(1).values()[0];
            return last.save_success === false;
        }
    };
    
    var redirect_to_prolific = {
        type: "html-keyboard-response",
        stimulus: "<p>Your responses have been saved.</p><p>You will now be redirected to Prolific.</p>",
        choices: jsPsych.NO_KEYS,
        trial_duration: 1000,
        on_finish: function() {
            window.location.href = PROLIFIC_COMPLETE_URL;
        }
    };
    
    var redirect_node = {
        timeline: [redirect_to_prolific],
        conditional_function: function() {
            var last = jsPsych.data.get().last(1).values()[0];
            return last.save_success === true;
        }
    };


    //timeline blocking: depends on if first list (recall instructions), last list (final page), or somewhere in between (ready page)
    var num_lists = 12;    // just go with 12 lists
    for(var list_no = 1; list_no < num_lists + 1; list_no++){
        if(list_no == 1){
            timeline.push(hold_keys_instructions);
            timeline.push(sound_tone);
            timeline.push(list_presentation);
            timeline.push(recall_instructions);
            timeline.push(recall_timer);
            timeline.push(recall_period);
            timeline.push(ready);
        } else if(list_no > 1 && list_no < num_lists){
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
    };

    timeline.push(save_data_node);
    timeline.push(save_failed_node);
    timeline.push(redirect_node);


    jsPsych.init({
        timeline: timeline,
        max_load_time: 120000,
        preload_audio: [
            '/static/audio/wordpool/ACTOR.wav', '/static/audio/wordpool/ACTRESS.wav', '/static/audio/wordpool/AGENT.wav', '/static/audio/wordpool/AIRPLANE.wav', '/static/audio/wordpool/AIRPORT.wav', '/static/audio/wordpool/ANKLE.wav', '/static/audio/wordpool/ANTLER.wav', '/static/audio/wordpool/APPLE.wav', '/static/audio/wordpool/APRON.wav', '/static/audio/wordpool/ARM.wav', '/static/audio/wordpool/ARMY.wav', '/static/audio/wordpool/ASIA.wav', '/static/audio/wordpool/ATLAS.wav', '/static/audio/wordpool/ATOM.wav', '/static/audio/wordpool/AUTHOR.wav', '/static/audio/wordpool/AWARD.wav', '/static/audio/wordpool/BABY.wav', '/static/audio/wordpool/BACKBONE.wav', '/static/audio/wordpool/BACON.wav', '/static/audio/wordpool/BADGE.wav', 
            '/static/audio/wordpool/BALLOON.wav', '/static/audio/wordpool/BANJO.wav', '/static/audio/wordpool/BANK.wav', '/static/audio/wordpool/BANKER.wav', '/static/audio/wordpool/BANQUET.wav', '/static/audio/wordpool/BARLEY.wav', '/static/audio/wordpool/BARREL.wav', '/static/audio/wordpool/BASEMENT.wav', '/static/audio/wordpool/BATHTUB.wav', '/static/audio/wordpool/BEAKER.wav', '/static/audio/wordpool/BEAST.wav', '/static/audio/wordpool/BEAVER.wav', '/static/audio/wordpool/BEEF.wav', '/static/audio/wordpool/BELLY.wav', '/static/audio/wordpool/BIKE.wav', '/static/audio/wordpool/BINDER.wav', '/static/audio/wordpool/BISON.wav', '/static/audio/wordpool/BLACKBOARD.wav', '/static/audio/wordpool/BLADE.wav', '/static/audio/wordpool/BLENDER.wav',
            '/static/audio/wordpool/BLOCKADE.wav', '/static/audio/wordpool/BLOUSE.wav', '/static/audio/wordpool/BLUEPRINT.wav', '/static/audio/wordpool/BODY.wav', '/static/audio/wordpool/BOUQUET.wav', '/static/audio/wordpool/BOX.wav', '/static/audio/wordpool/BOYFRIEND.wav', '/static/audio/wordpool/BRACES.wav', '/static/audio/wordpool/BRANCH.wav', '/static/audio/wordpool/BRANDY.wav', '/static/audio/wordpool/BREAST.wav', '/static/audio/wordpool/BRICK.wav', '/static/audio/wordpool/BRIEFCASE.wav', '/static/audio/wordpool/BROOK.wav', '/static/audio/wordpool/BROTHER.wav', '/static/audio/wordpool/BUBBLE.wav', '/static/audio/wordpool/BUCKET.wav', '/static/audio/wordpool/BUG.wav', '/static/audio/wordpool/BUGGY.wav', '/static/audio/wordpool/BULLET.wav',
            '/static/audio/wordpool/BUNNY.wav', '/static/audio/wordpool/BUREAU.wav', '/static/audio/wordpool/BURGLAR.wav', '/static/audio/wordpool/BUTCHER.wav', '/static/audio/wordpool/CABBAGE.wav', '/static/audio/wordpool/CABIN.wav', '/static/audio/wordpool/CAFE.wav', '/static/audio/wordpool/CAMEL.wav', '/static/audio/wordpool/CANAL.wav', '/static/audio/wordpool/CANDY.wav', '/static/audio/wordpool/CANYON.wav', '/static/audio/wordpool/CAPTIVE.wav', '/static/audio/wordpool/CARRIAGE.wav', '/static/audio/wordpool/CARROT.wav', '/static/audio/wordpool/CASHEW.wav', '/static/audio/wordpool/CASHIER.wav', '/static/audio/wordpool/CASKET.wav', '/static/audio/wordpool/CATCHER.wav', '/static/audio/wordpool/CATTLE.wav', '/static/audio/wordpool/CELLAR.wav',
            '/static/audio/wordpool/CHAMPAGNE.wav', '/static/audio/wordpool/CHAPEL.wav', '/static/audio/wordpool/CHAUFFEUR.wav', '/static/audio/wordpool/CHEMIST.wav', '/static/audio/wordpool/CHEST.wav', '/static/audio/wordpool/CHILD.wav', '/static/audio/wordpool/CHIPMUNK.wav', '/static/audio/wordpool/CHURCH.wav', '/static/audio/wordpool/CIGAR.wav', '/static/audio/wordpool/CITRUS.wav', '/static/audio/wordpool/CLAM.wav', '/static/audio/wordpool/CLAMP.wav', '/static/audio/wordpool/CLIMBER.wav', '/static/audio/wordpool/CLOCK.wav', '/static/audio/wordpool/CLOTHES.wav', '/static/audio/wordpool/CLOUD.wav', '/static/audio/wordpool/COBRA.wav', '/static/audio/wordpool/COCKTAIL.wav', '/static/audio/wordpool/COCOON.wav', '/static/audio/wordpool/COD.wav',
            '/static/audio/wordpool/COFFEE.wav', '/static/audio/wordpool/COIN.wav', '/static/audio/wordpool/COLLEGE.wav', '/static/audio/wordpool/COMET.wav', '/static/audio/wordpool/COMPASS.wav', '/static/audio/wordpool/CONCERT.wav', '/static/audio/wordpool/CONTRACT.wav', '/static/audio/wordpool/CONVICT.wav', '/static/audio/wordpool/COOK.wav', '/static/audio/wordpool/COOKBOOK.wav', '/static/audio/wordpool/COSTUME.wav', '/static/audio/wordpool/COTTAGE.wav', '/static/audio/wordpool/COUCH.wav', '/static/audio/wordpool/COUNTRY.wav', '/static/audio/wordpool/COUNTY.wav', '/static/audio/wordpool/COUSIN.wav', '/static/audio/wordpool/COWBOY.wav', '/static/audio/wordpool/CRAB.wav', '/static/audio/wordpool/CRATER.wav', '/static/audio/wordpool/CRAYON.wav',
            '/static/audio/wordpool/CREATURE.wav', '/static/audio/wordpool/CREVICE.wav', '/static/audio/wordpool/CRIB.wav', '/static/audio/wordpool/CRICKET.wav', '/static/audio/wordpool/CRITIC.wav', '/static/audio/wordpool/CROSS.wav', '/static/audio/wordpool/CROWN.wav', '/static/audio/wordpool/CRUTCH.wav', '/static/audio/wordpool/CUPBOARD.wav', '/static/audio/wordpool/CURTAIN.wav', '/static/audio/wordpool/CUSTARD.wav', '/static/audio/wordpool/CYCLONE.wav', '/static/audio/wordpool/DAISY.wav', '/static/audio/wordpool/DANCER.wav', '/static/audio/wordpool/DANDRUFF.wav', '/static/audio/wordpool/DASHBOARD.wav', '/static/audio/wordpool/DAUGHTER.wav', '/static/audio/wordpool/DENIM.wav', '/static/audio/wordpool/DENTIST.wav', '/static/audio/wordpool/DIME.wav',
            '/static/audio/wordpool/DINER.wav', '/static/audio/wordpool/DIVER.wav', '/static/audio/wordpool/DOLPHIN.wav', '/static/audio/wordpool/DONKEY.wav', '/static/audio/wordpool/DONOR.wav', '/static/audio/wordpool/DORM.wav', '/static/audio/wordpool/DOUGHNUT.wav', '/static/audio/wordpool/DRAGON.wav', '/static/audio/wordpool/DRAWING.wav', '/static/audio/wordpool/DRESS.wav', '/static/audio/wordpool/DRESSER.wav', '/static/audio/wordpool/DRILL.wav', '/static/audio/wordpool/DRINK.wav', '/static/audio/wordpool/DRIVER.wav', '/static/audio/wordpool/DRUG.wav', '/static/audio/wordpool/DUST.wav', '/static/audio/wordpool/DUSTPAN.wav', '/static/audio/wordpool/EAGLE.wav', '/static/audio/wordpool/EGYPT.wav', '/static/audio/wordpool/ELBOW.wav',
            '/static/audio/wordpool/EMPIRE.wav', '/static/audio/wordpool/EUROPE.wav', '/static/audio/wordpool/EXPERT.wav', '/static/audio/wordpool/EYELASH.wav', '/static/audio/wordpool/FARMER.wav', '/static/audio/wordpool/FEMALE.wav', '/static/audio/wordpool/FIDDLE.wav', '/static/audio/wordpool/FILM.wav', '/static/audio/wordpool/FINGER.wav', '/static/audio/wordpool/FIREMAN.wav', '/static/audio/wordpool/FIREPLACE.wav', '/static/audio/wordpool/FLAG.wav', '/static/audio/wordpool/FLASHLIGHT.wav', '/static/audio/wordpool/FLASK.wav', '/static/audio/wordpool/FLEET.wav', '/static/audio/wordpool/FLESH.wav', '/static/audio/wordpool/FLIPPER.wav', '/static/audio/wordpool/FLOWER.wav', '/static/audio/wordpool/FLUTE.wav', '/static/audio/wordpool/FOOT.wav',
            '/static/audio/wordpool/FOOTBALL.wav', '/static/audio/wordpool/FOREHEAD.wav', '/static/audio/wordpool/FOREST.wav', '/static/audio/wordpool/FOX.wav', '/static/audio/wordpool/FRAGRANCE.wav', '/static/audio/wordpool/FRAME.wav', '/static/audio/wordpool/FRANCE.wav', '/static/audio/wordpool/FRECKLE.wav', '/static/audio/wordpool/FREEZER.wav', '/static/audio/wordpool/FRIEND.wav', '/static/audio/wordpool/FRUIT.wav', '/static/audio/wordpool/FUNGUS.wav', '/static/audio/wordpool/GALLON.wav', '/static/audio/wordpool/GANGSTER.wav', '/static/audio/wordpool/GARBAGE.wav', '/static/audio/wordpool/GARDEN.wav', '/static/audio/wordpool/GARLIC.wav', '/static/audio/wordpool/GAVEL.wav', '/static/audio/wordpool/GAZELLE.wav', '/static/audio/wordpool/GHETTO.wav',
            '/static/audio/wordpool/GIFT.wav', '/static/audio/wordpool/GIRL.wav', '/static/audio/wordpool/GLASS.wav', '/static/audio/wordpool/GLOBE.wav', '/static/audio/wordpool/GLOVE.wav', '/static/audio/wordpool/GOBLIN.wav', '/static/audio/wordpool/GRAPE.wav', '/static/audio/wordpool/GRAVE.wav', '/static/audio/wordpool/GRAVEL.wav', '/static/audio/wordpool/GRILL.wav', '/static/audio/wordpool/GROUND.wav', '/static/audio/wordpool/GUARD.wav', '/static/audio/wordpool/GUITAR.wav', '/static/audio/wordpool/GYMNAST.wav', '/static/audio/wordpool/HAMPER.wav', '/static/audio/wordpool/HAND.wav', '/static/audio/wordpool/HANDBAG.wav', '/static/audio/wordpool/HARP.wav', '/static/audio/wordpool/HATCHET.wav', '/static/audio/wordpool/HAWK.wav',
            '/static/audio/wordpool/HEADBAND.wav', '/static/audio/wordpool/HEART.wav', '/static/audio/wordpool/HEDGE.wav', '/static/audio/wordpool/HELMET.wav', '/static/audio/wordpool/HERO.wav', '/static/audio/wordpool/HIGHWAY.wav', '/static/audio/wordpool/HIKER.wav', '/static/audio/wordpool/HONEY.wav', '/static/audio/wordpool/HOOD.wav', '/static/audio/wordpool/HOOK.wav', '/static/audio/wordpool/HORNET.wav', '/static/audio/wordpool/HOSTESS.wav', '/static/audio/wordpool/HOUND.wav', '/static/audio/wordpool/HUMAN.wav', '/static/audio/wordpool/HUSBAND.wav', '/static/audio/wordpool/ICEBERG.wav', '/static/audio/wordpool/ICING.wav', '/static/audio/wordpool/IGLOO.wav', '/static/audio/wordpool/INFANT.wav', '/static/audio/wordpool/INMATE.wav',
            '/static/audio/wordpool/ISLAND.wav', '/static/audio/wordpool/ITEM.wav', '/static/audio/wordpool/JAPAN.wav', '/static/audio/wordpool/JELLO.wav', '/static/audio/wordpool/JELLY.wav', '/static/audio/wordpool/JOURNAL.wav', '/static/audio/wordpool/JUDGE.wav', '/static/audio/wordpool/JUGGLER.wav', '/static/audio/wordpool/JUNGLE.wav', '/static/audio/wordpool/JURY.wav', '/static/audio/wordpool/KEEPER.wav', '/static/audio/wordpool/KETCHUP.wav', '/static/audio/wordpool/KIDNEY.wav', '/static/audio/wordpool/KITCHEN.wav', '/static/audio/wordpool/KLEENEX.wav', '/static/audio/wordpool/KNAPSACK.wav', '/static/audio/wordpool/KNIFE.wav', '/static/audio/wordpool/LABEL.wav', '/static/audio/wordpool/LACE.wav', '/static/audio/wordpool/LADY.wav',
            '/static/audio/wordpool/LAGOON.wav', '/static/audio/wordpool/LAKE.wav', '/static/audio/wordpool/LAMP.wav', '/static/audio/wordpool/LAPEL.wav', '/static/audio/wordpool/LASER.wav', '/static/audio/wordpool/LAVA.wav', '/static/audio/wordpool/LEADER.wav', '/static/audio/wordpool/LEG.wav', '/static/audio/wordpool/LEOPARD.wav', '/static/audio/wordpool/LETTUCE.wav', '/static/audio/wordpool/LIGHTNING.wav', '/static/audio/wordpool/LILY.wav', '/static/audio/wordpool/LION.wav', '/static/audio/wordpool/LIPSTICK.wav', '/static/audio/wordpool/LIVER.wav', '/static/audio/wordpool/LIZARD.wav', '/static/audio/wordpool/LODGE.wav', '/static/audio/wordpool/LOFT.wav', '/static/audio/wordpool/LONDON.wav', '/static/audio/wordpool/LOVER.wav',
            '/static/audio/wordpool/LUGGAGE.wav', '/static/audio/wordpool/LUMBER.wav', '/static/audio/wordpool/LUNCH.wav', '/static/audio/wordpool/MACHINE.wav', '/static/audio/wordpool/MAILBOX.wav', '/static/audio/wordpool/MAILMAN.wav', '/static/audio/wordpool/MAMMAL.wav', '/static/audio/wordpool/MAPLE.wav', '/static/audio/wordpool/MARINE.wav', '/static/audio/wordpool/MARKER.wav', '/static/audio/wordpool/MARKET.wav', '/static/audio/wordpool/MARROW.wav', '/static/audio/wordpool/MARS.wav', '/static/audio/wordpool/MARSH.wav', '/static/audio/wordpool/MASK.wav', '/static/audio/wordpool/MATCH.wav', '/static/audio/wordpool/MATTRESS.wav', '/static/audio/wordpool/MESSAGE.wav', '/static/audio/wordpool/MILDEW.wav', '/static/audio/wordpool/MILK.wav',
            '/static/audio/wordpool/MISSILE.wav', '/static/audio/wordpool/MISTER.wav', '/static/audio/wordpool/MONEY.wav', '/static/audio/wordpool/MONSTER.wav', '/static/audio/wordpool/MOP.wav', '/static/audio/wordpool/MOTEL.wav', '/static/audio/wordpool/MOTOR.wav', '/static/audio/wordpool/MUFFIN.wav', '/static/audio/wordpool/MUMMY.wav', '/static/audio/wordpool/MUSTARD.wav', '/static/audio/wordpool/NAPKIN.wav', '/static/audio/wordpool/NECKLACE.wav', '/static/audio/wordpool/NEUTRON.wav', '/static/audio/wordpool/NIGHTGOWN.wav', '/static/audio/wordpool/NOMAD.wav', '/static/audio/wordpool/NOTEBOOK.wav', '/static/audio/wordpool/NOVEL.wav', '/static/audio/wordpool/NURSE.wav', '/static/audio/wordpool/OFFICE.wav', '/static/audio/wordpool/OINTMENT.wav',
            '/static/audio/wordpool/OMELET.wav', '/static/audio/wordpool/ONION.wav', '/static/audio/wordpool/ORANGE.wav', '/static/audio/wordpool/ORCHID.wav', '/static/audio/wordpool/OUTDOORS.wav', '/static/audio/wordpool/OUTFIT.wav', '/static/audio/wordpool/OUTLAW.wav', '/static/audio/wordpool/OX.wav', '/static/audio/wordpool/OYSTER.wav', '/static/audio/wordpool/OZONE.wav', '/static/audio/wordpool/PACKAGE.wav', '/static/audio/wordpool/PADDING.wav', '/static/audio/wordpool/PADDLE.wav', '/static/audio/wordpool/PALACE.wav', '/static/audio/wordpool/PANTHER.wav', '/static/audio/wordpool/PAPER.wav', '/static/audio/wordpool/PARENT.wav', '/static/audio/wordpool/PARROT.wav', '/static/audio/wordpool/PARSLEY.wav', '/static/audio/wordpool/PARTNER.wav',
            '/static/audio/wordpool/PASSAGE.wav', '/static/audio/wordpool/PASTA.wav', '/static/audio/wordpool/PASTRY.wav', '/static/audio/wordpool/PATIENT.wav', '/static/audio/wordpool/PATROL.wav', '/static/audio/wordpool/PEACH.wav', '/static/audio/wordpool/PEANUT.wav', '/static/audio/wordpool/PEBBLE.wav', '/static/audio/wordpool/PECAN.wav', '/static/audio/wordpool/PENGUIN.wav', '/static/audio/wordpool/PEPPER.wav', '/static/audio/wordpool/PERCH.wav', '/static/audio/wordpool/PERFUME.wav', '/static/audio/wordpool/PERMIT.wav', '/static/audio/wordpool/PIANO.wav', '/static/audio/wordpool/PICNIC.wav', '/static/audio/wordpool/PICTURE.wav', '/static/audio/wordpool/PIGEON.wav', '/static/audio/wordpool/PIGMENT.wav', '/static/audio/wordpool/PILOT.wav',
            '/static/audio/wordpool/PIMPLE.wav', '/static/audio/wordpool/PISTOL.wav', '/static/audio/wordpool/PISTON.wav', '/static/audio/wordpool/PIZZA.wav', '/static/audio/wordpool/PLAID.wav', '/static/audio/wordpool/PLASTER.wav', '/static/audio/wordpool/PLATE.wav', '/static/audio/wordpool/PLAYGROUND.wav', '/static/audio/wordpool/PLAZA.wav', '/static/audio/wordpool/PLIERS.wav', '/static/audio/wordpool/PLUTO.wav', '/static/audio/wordpool/POCKET.wav', '/static/audio/wordpool/POET.wav', '/static/audio/wordpool/POISON.wav', '/static/audio/wordpool/POLICE.wav', '/static/audio/wordpool/POPCORN.wav', '/static/audio/wordpool/PORK.wav', '/static/audio/wordpool/PORTRAIT.wav', '/static/audio/wordpool/POSSUM.wav', '/static/audio/wordpool/POSTAGE.wav',
            '/static/audio/wordpool/POWDER.wav', '/static/audio/wordpool/PREACHER.wav', '/static/audio/wordpool/PRIMATE.wav', '/static/audio/wordpool/PRINCESS.wav', '/static/audio/wordpool/PROTON.wav', '/static/audio/wordpool/PUDDING.wav', '/static/audio/wordpool/PUDDLE.wav', '/static/audio/wordpool/PUPPY.wav', '/static/audio/wordpool/QUAIL.wav', '/static/audio/wordpool/QUARTER.wav', '/static/audio/wordpool/QUEEN.wav', '/static/audio/wordpool/RABBIT.wav', '/static/audio/wordpool/RACKET.wav', '/static/audio/wordpool/RADISH.wav', '/static/audio/wordpool/RAFT.wav', '/static/audio/wordpool/RATTLE.wav', '/static/audio/wordpool/RAZOR.wav', '/static/audio/wordpool/REBEL.wav', '/static/audio/wordpool/RECEIPT.wav', '/static/audio/wordpool/RECORD.wav',
            '/static/audio/wordpool/RELISH.wav', '/static/audio/wordpool/REPORT.wav', '/static/audio/wordpool/RIFLE.wav', '/static/audio/wordpool/RIVER.wav', '/static/audio/wordpool/ROBBER.wav', '/static/audio/wordpool/ROBIN.wav', '/static/audio/wordpool/ROBOT.wav', '/static/audio/wordpool/ROCKET.wav', '/static/audio/wordpool/ROD.wav', '/static/audio/wordpool/ROOSTER.wav', '/static/audio/wordpool/RUG.wav', '/static/audio/wordpool/RUST.wav', '/static/audio/wordpool/SADDLE.wav', '/static/audio/wordpool/SALAD.wav', '/static/audio/wordpool/SALMON.wav', '/static/audio/wordpool/SALT.wav', '/static/audio/wordpool/SANDWICH.wav', '/static/audio/wordpool/SAUSAGE.wav', '/static/audio/wordpool/SCALLOP.wav', '/static/audio/wordpool/SCALPEL.wav',
            '/static/audio/wordpool/SCARECROW.wav', '/static/audio/wordpool/SCARF.wav', '/static/audio/wordpool/SCISSORS.wav', '/static/audio/wordpool/SCOTCH.wav', '/static/audio/wordpool/SCRIBBLE.wav', '/static/audio/wordpool/SCULPTURE.wav', '/static/audio/wordpool/SEAFOOD.wav', '/static/audio/wordpool/SEAGULL.wav', '/static/audio/wordpool/SEAL.wav', '/static/audio/wordpool/SERVANT.wav', '/static/audio/wordpool/SERVER.wav', '/static/audio/wordpool/SHARK.wav', '/static/audio/wordpool/SHELF.wav', '/static/audio/wordpool/SHELTER.wav', '/static/audio/wordpool/SHERIFF.wav', '/static/audio/wordpool/SHIRT.wav', '/static/audio/wordpool/SHORTCAKE.wav', '/static/audio/wordpool/SHORTS.wav', '/static/audio/wordpool/SHOULDER.wav', '/static/audio/wordpool/SHOVEL.wav',
            '/static/audio/wordpool/SHRUB.wav', '/static/audio/wordpool/SIBLING.wav', '/static/audio/wordpool/SIDEWALK.wav', '/static/audio/wordpool/SILK.wav', '/static/audio/wordpool/SISTER.wav', '/static/audio/wordpool/SKETCH.wav', '/static/audio/wordpool/SKILLET.wav', '/static/audio/wordpool/SKIRT.wav', '/static/audio/wordpool/SLIDE.wav', '/static/audio/wordpool/SLIME.wav', '/static/audio/wordpool/SLOPE.wav', '/static/audio/wordpool/SLUG.wav', '/static/audio/wordpool/SMOG.wav', '/static/audio/wordpool/SNACK.wav', '/static/audio/wordpool/SNAIL.wav', '/static/audio/wordpool/SNAKE.wav', '/static/audio/wordpool/SODA.wav', '/static/audio/wordpool/SOFTBALL.wav', '/static/audio/wordpool/SPACE.wav', '/static/audio/wordpool/SPARROW.wav',
            '/static/audio/wordpool/SPHINX.wav', '/static/audio/wordpool/SPIDER.wav', '/static/audio/wordpool/SPONGE.wav', '/static/audio/wordpool/SPOOL.wav', '/static/audio/wordpool/SPOON.wav', '/static/audio/wordpool/SPOUSE.wav', '/static/audio/wordpool/STALLION.wav', '/static/audio/wordpool/STAMP.wav', '/static/audio/wordpool/STAPLE.wav', '/static/audio/wordpool/STAR.wav', '/static/audio/wordpool/STATUE.wav', '/static/audio/wordpool/STICKER.wav', '/static/audio/wordpool/STOMACH.wav', '/static/audio/wordpool/STONE.wav', '/static/audio/wordpool/STOVE.wav', '/static/audio/wordpool/STREAM.wav', '/static/audio/wordpool/STUDENT.wav', '/static/audio/wordpool/SUBWAY.wav', '/static/audio/wordpool/SUITCASE.wav', '/static/audio/wordpool/SUMMIT.wav',
            '/static/audio/wordpool/SUNRISE.wav', '/static/audio/wordpool/SUNSET.wav', '/static/audio/wordpool/SUPPER.wav', '/static/audio/wordpool/SURVEY.wav', '/static/audio/wordpool/SUSPECT.wav', '/static/audio/wordpool/SWAMP.wav', '/static/audio/wordpool/SWIMMER.wav', '/static/audio/wordpool/SWITCH.wav', '/static/audio/wordpool/SWORD.wav', '/static/audio/wordpool/TABLE.wav', '/static/audio/wordpool/TABLET.wav', '/static/audio/wordpool/TART.wav', '/static/audio/wordpool/TAXI.wav', '/static/audio/wordpool/TEACHER.wav', '/static/audio/wordpool/TEMPLE.wav', '/static/audio/wordpool/TERMITE.wav', '/static/audio/wordpool/THIEF.wav', '/static/audio/wordpool/THREAD.wav', '/static/audio/wordpool/TILE.wav', '/static/audio/wordpool/TOASTER.wav',
            '/static/audio/wordpool/TOMBSTONE.wav', '/static/audio/wordpool/TORTOISE.wav', '/static/audio/wordpool/TOURIST.wav', '/static/audio/wordpool/TRACTOR.wav', '/static/audio/wordpool/TRANSPLANT.wav', '/static/audio/wordpool/TREAT.wav', '/static/audio/wordpool/TRENCH.wav', '/static/audio/wordpool/TRIBE.wav', '/static/audio/wordpool/TROMBONE.wav', '/static/audio/wordpool/TROUT.wav', '/static/audio/wordpool/TRUCK.wav', '/static/audio/wordpool/TUBA.wav', '/static/audio/wordpool/TUNNEL.wav', '/static/audio/wordpool/TURKEY.wav', '/static/audio/wordpool/TURNIP.wav', '/static/audio/wordpool/TURTLE.wav', '/static/audio/wordpool/TUTU.wav', '/static/audio/wordpool/TWEEZERS.wav', '/static/audio/wordpool/TWIG.wav', '/static/audio/wordpool/TWISTER.wav',
            '/static/audio/wordpool/TYPIST.wav', '/static/audio/wordpool/ULCER.wav', '/static/audio/wordpool/UMPIRE.wav', '/static/audio/wordpool/UNCLE.wav', '/static/audio/wordpool/VAGRANT.wav', '/static/audio/wordpool/VALLEY.wav', '/static/audio/wordpool/VALVE.wav', '/static/audio/wordpool/VELVET.wav', '/static/audio/wordpool/VENUS.wav', '/static/audio/wordpool/VICTIM.wav', '/static/audio/wordpool/VIKING.wav', '/static/audio/wordpool/VIRUS.wav', '/static/audio/wordpool/WAGON.wav', '/static/audio/wordpool/WAITER.wav', '/static/audio/wordpool/WAITRESS.wav', '/static/audio/wordpool/WARDROBE.wav', '/static/audio/wordpool/WASHER.wav', '/static/audio/wordpool/WASP.wav', '/static/audio/wordpool/WHISKERS.wav', '/static/audio/wordpool/WHISTLE.wav',
            '/static/audio/wordpool/WIDOW.wav', '/static/audio/wordpool/WIFE.wav', '/static/audio/wordpool/WINDOW.wav', '/static/audio/wordpool/WITNESS.wav', '/static/audio/wordpool/WOMAN.wav', '/static/audio/wordpool/WORKER.wav', '/static/audio/wordpool/WORLD.wav', '/static/audio/wordpool/WRENCH.wav', '/static/audio/wordpool/WRIST.wav', '/static/audio/wordpool/XEROX.wav', '/static/audio/wordpool/YACHT.wav', '/static/audio/wordpool/YARN.wav', '/static/audio/wordpool/ZEBRA.wav', '/static/audio/wordpool/ZIPPER.wav', '/static/audio/wordpool/AudioTest/Test2.wav', '/static/audio/400Hz.wav'
        ],
    });
}

runExperiment();