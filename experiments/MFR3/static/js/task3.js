function runExperiment() {

    var psiturk = new PsiTurk(uniqueId, adServerLoc, mode);

    var mycondition = condition;
    var mycounterbalance = counterbalance;

    var workerId = uniqueId.split(':')[0];

    var timeline = [];

    //condition randomizer, autopopulates rest of experiment (list_length, presentation_rate)
    var conditions_arr = [
        [10, 2000],
        [20, 1000],
        [15, 2000],
        [20, 2000],
        [30, 1000],
        [40, 1000]
    ];

    //variables that hold which condition the participant is in
    var condition_row = Math.floor(Math.random() * 6); 
    // place in same session
    if (c0.includes(workerId)){
        condition_row = 0;
    } else if (c1.includes(workerId)){
        condition_row = 1;
    } else if (c2.includes(workerId)){
        condition_row = 2;
    } else if (c3.includes(workerId)){
        condition_row = 3;
    } else if (c4.includes(workerId)){
        condition_row = 4;
    } else if (c5.includes(workerId)){
        condition_row = 5;
    };
    var list_length = conditions_arr[condition_row][0];
    var presentation_rate = conditions_arr[condition_row][1];

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

    // TODO: ask them to return the HIT due to failed attention check
    let fail_message = {
        type: 'html-keyboard-response',
        response_ends_trial: false,
        stimulus: "<p>The preceding page was designed to screen participants who are not carefully paying attention.</p> \
        <p>Please do not reload the page.</p> \
        <p>Based on your responses to these questions, we ask that you return this HIT to MTurk at this time.</p>"
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
            '<p>Thank you for your continued participation, attention, and effort in our experiment!</p> \
            <p>The next page will give you a refresher on how the experiment will run.</p>',
            '<p>In this experiment you will be presented with a list of words, which you will hear one after another.</p> \
            <p>Then, there will be a 90 second recall period where you will be asked to recall the words from the list \
            by typing them into the recall box in any order.</p><p>This process of hearing a list of words and \
            then recalling those words will repeat for 12 lists, all of different words.</p><p>Remember to recall words from \
            the immediately preceeding list during each recall period.</p>',
            '<p>Please do NOT write down words, as this experiment is trying to study human memory!</p> \
            <p>Also, please do give your full attention and best effort to recall as many words as you can.</p> \
            <p>Again, honest performance on this task will qualify you for 1 more further, more lucrative \
            follow up session.</p>',
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
        {audio: '/static/audio/wordpool/ACTOR.wav', word: "Actor"}, {audio: '/static/audio/wordpool/ACTRESS.wav', word: "Actress"}, {audio: '/static/audio/wordpool/AGENT.wav', word: "Agent"}, {audio: '/static/audio/wordpool/AIRPLANE.wav', word: "Airplane"}, {audio: '/static/audio/wordpool/AIRPORT.wav', word: "Airport"}, {audio: '/static/audio/wordpool/ANKLE.wav', word: "Ankle"}, {audio: '/static/audio/wordpool/ANTLER.wav', word: "Antler"}, {audio: '/static/audio/wordpool/APPLE.wav', word: "Apple"}, {audio: '/static/audio/wordpool/APRON.wav', word: "Apron"}, {audio: '/static/audio/wordpool/ARM.wav', word: "Arm"},{audio: '/static/audio/wordpool/ARMY.wav', word: "Army"}, {audio: '/static/audio/wordpool/ASIA.wav', word: "Asia"}, {audio: '/static/audio/wordpool/ATLAS.wav', word: "Atlas"}, {audio: '/static/audio/wordpool/ATOM.wav', word: "Atom"}, {audio: '/static/audio/wordpool/AUTHOR.wav', word: "Author"}, {audio: '/static/audio/wordpool/AWARD.wav', word: "Award"}, {audio: '/static/audio/wordpool/BABY.wav', word: "Baby"}, {audio: '/static/audio/wordpool/BACKBONE.wav', word: "Backbone"}, {audio: '/static/audio/wordpool/BACON.wav', word: "Bacon"}, {audio: '/static/audio/wordpool/BADGE.wav', word: "Badge"}, 
        {audio: '/static/audio/wordpool/BALLOON.wav', word: "Balloon"}, {audio: '/static/audio/wordpool/BANJO.wav', word: "Banjo"}, {audio: '/static/audio/wordpool/BANK.wav', word: "Bank"}, {audio: '/static/audio/wordpool/BANKER.wav', word: "Banker"}, {audio: '/static/audio/wordpool/BANQUET.wav', word: "Banquet"}, {audio: '/static/audio/wordpool/BARLEY.wav', word: "Barley"}, {audio: '/static/audio/wordpool/BARREL.wav', word: "Barrel"}, {audio: '/static/audio/wordpool/BASEMENT.wav', word: "Basement"}, {audio: '/static/audio/wordpool/BATHTUB.wav', word: "Bathtub"}, {audio: '/static/audio/wordpool/BEAKER.wav', word: "Beaker"}, {audio: '/static/audio/wordpool/BEAST.wav', word: "Beast"}, {audio: '/static/audio/wordpool/BEAVER.wav', word: "Beaver"}, {audio: '/static/audio/wordpool/BEEF.wav', word: "Beef"}, {audio: '/static/audio/wordpool/BELLY.wav', word: "Belly"}, {audio: '/static/audio/wordpool/BIKE.wav', word: "Bike"}, {audio: '/static/audio/wordpool/BINDER.wav', word: "Binder"}, {audio: '/static/audio/wordpool/BISON.wav', word: "Bison"}, {audio: '/static/audio/wordpool/BLACKBOARD.wav', word: "Blackboard"}, {audio: '/static/audio/wordpool/BLADE.wav', word: "Blade"}, {audio: '/static/audio/wordpool/BLENDER.wav', word: "Blender"},
        {audio: '/static/audio/wordpool/BLOCKADE.wav', word: "Blockade"}, {audio: '/static/audio/wordpool/BLOUSE.wav', word: "Blouse"}, {audio: '/static/audio/wordpool/BLUEPRINT.wav', word: "Blueprint"}, {audio: '/static/audio/wordpool/BODY.wav', word: "Body"}, {audio: '/static/audio/wordpool/BOUQUET.wav', word: "Bouquet"}, {audio: '/static/audio/wordpool/BOX.wav', word: "Box"}, {audio: '/static/audio/wordpool/BOYFRIEND.wav', word: "Boyfriend"}, {audio: '/static/audio/wordpool/BRACES.wav', word: "Braces"}, {audio: '/static/audio/wordpool/BRANCH.wav', word: "Branch"}, {audio: '/static/audio/wordpool/BRANDY.wav', word: "Brandy"}, {audio: '/static/audio/wordpool/BREAST.wav', word: "Breast"}, {audio: '/static/audio/wordpool/BRICK.wav', word: "Brick"}, {audio: '/static/audio/wordpool/BRIEFCASE.wav', word: "Briefcase"}, {audio: '/static/audio/wordpool/BROOK.wav', word: "Brook"}, {audio: '/static/audio/wordpool/BROTHER.wav', word: "Brother"}, {audio: '/static/audio/wordpool/BUBBLE.wav', word: "Bubble"}, {audio: '/static/audio/wordpool/BUCKET.wav', word: "Bucket"}, {audio: '/static/audio/wordpool/BUG.wav', word: "Bug"}, {audio: '/static/audio/wordpool/BUGGY.wav', word: "Buggy"}, {audio: '/static/audio/wordpool/BULLET.wav', word: "Bullet"},
        {audio: '/static/audio/wordpool/BUNNY.wav', word: "Bunny"}, {audio: '/static/audio/wordpool/BUREAU.wav', word: "Bureau"}, {audio: '/static/audio/wordpool/BURGLAR.wav', word: "Burglar"}, {audio: '/static/audio/wordpool/BUTCHER.wav', word: "Butcher"}, {audio: '/static/audio/wordpool/CABBAGE.wav', word: "Cabbage"}, {audio: '/static/audio/wordpool/CABIN.wav', word: "Cabin"}, {audio: '/static/audio/wordpool/CAFE.wav', word: "Cafe"}, {audio: '/static/audio/wordpool/CAMEL.wav', word: "Camel"}, {audio: '/static/audio/wordpool/CANAL.wav', word: "Canal"}, {audio: '/static/audio/wordpool/CANDY.wav', word: "Candy"}, {audio: '/static/audio/wordpool/CANYON.wav', word: "Canyon"}, {audio: '/static/audio/wordpool/CAPTIVE.wav', word: "Captive"}, {audio: '/static/audio/wordpool/CARRIAGE.wav', word: "Carriage"}, {audio: '/static/audio/wordpool/CARROT.wav', word: "Carrot"}, {audio: '/static/audio/wordpool/CASHEW.wav', word: "Cashew"}, {audio: '/static/audio/wordpool/CASHIER.wav', word: "Cashier"}, {audio: '/static/audio/wordpool/CASKET.wav', word: "Casket"}, {audio: '/static/audio/wordpool/CATCHER.wav', word: "Catcher"}, {audio: '/static/audio/wordpool/CATTLE.wav', word: "Cattle"}, {audio: '/static/audio/wordpool/CELLAR.wav', word: "Cellar"},
        {audio: '/static/audio/wordpool/CHAMPAGNE.wav', word: "Champagne"}, {audio: '/static/audio/wordpool/CHAPEL.wav', word: "Chapel"}, {audio: '/static/audio/wordpool/CHAUFFEUR.wav', word: "Chauffeur"}, {audio: '/static/audio/wordpool/CHEMIST.wav', word: "Chemist"}, {audio: '/static/audio/wordpool/CHEST.wav', word: "Chest"}, {audio: '/static/audio/wordpool/CHILD.wav', word: "Child"}, {audio: '/static/audio/wordpool/CHIPMUNK.wav', word: "Chipmunk"}, {audio: '/static/audio/wordpool/CHURCH.wav', word: "Church"}, {audio: '/static/audio/wordpool/CIGAR.wav', word: "Cigar"}, {audio: '/static/audio/wordpool/CITRUS.wav', word: "Citrus"}, {audio: '/static/audio/wordpool/CLAM.wav', word: "Clam"}, {audio: '/static/audio/wordpool/CLAMP.wav', word: "Clamp"}, {audio: '/static/audio/wordpool/CLIMBER.wav', word: "Climber"}, {audio: '/static/audio/wordpool/CLOCK.wav', word: "Clock"}, {audio: '/static/audio/wordpool/CLOTHES.wav', word: "Clothes"}, {audio: '/static/audio/wordpool/CLOUD.wav', word: "Cloud"}, {audio: '/static/audio/wordpool/COBRA.wav', word: "Cobra"}, {audio: '/static/audio/wordpool/COCKTAIL.wav', word: "Cocktail"}, {audio: '/static/audio/wordpool/COCOON.wav', word: "Cocoon"}, {audio: '/static/audio/wordpool/COD.wav', word: "Cod"},
        {audio: '/static/audio/wordpool/COFFEE.wav', word: "Coffee"}, {audio: '/static/audio/wordpool/COIN.wav', word: "Coin"}, {audio: '/static/audio/wordpool/COLLEGE.wav', word: "College"}, {audio: '/static/audio/wordpool/COMET.wav', word: "Comet"}, {audio: '/static/audio/wordpool/COMPASS.wav', word: "Compass"}, {audio: '/static/audio/wordpool/CONCERT.wav', word: "Concert"}, {audio: '/static/audio/wordpool/CONTRACT.wav', word: "Contract"}, {audio: '/static/audio/wordpool/CONVICT.wav', word: "Convict"}, {audio: '/static/audio/wordpool/COOK.wav', word: "Cook"}, {audio: '/static/audio/wordpool/COOKBOOK.wav', word: "Cookbook"}, {audio: '/static/audio/wordpool/COSTUME.wav', word: "Costume"}, {audio: '/static/audio/wordpool/COTTAGE.wav', word: "Cottage"}, {audio: '/static/audio/wordpool/COUCH.wav', word: "Couch"}, {audio: '/static/audio/wordpool/COUNTRY.wav', word: "Country"}, {audio: '/static/audio/wordpool/COUNTY.wav', word: "County"}, {audio: '/static/audio/wordpool/COUSIN.wav', word: "Cousin"}, {audio: '/static/audio/wordpool/COWBOY.wav', word: "Cowboy"}, {audio: '/static/audio/wordpool/CRAB.wav', word: "Crab"}, {audio: '/static/audio/wordpool/CRATER.wav', word: "Crater"}, {audio: '/static/audio/wordpool/CRAYON.wav', word: "Crayon"},
        {audio: '/static/audio/wordpool/CREATURE.wav', word: "Creature"}, {audio: '/static/audio/wordpool/CREVICE.wav', word: "Crevice"}, {audio: '/static/audio/wordpool/CRIB.wav', word: "Crib"}, {audio: '/static/audio/wordpool/CRICKET.wav', word: "Cricket"}, {audio: '/static/audio/wordpool/CRITIC.wav', word: "Critic"}, {audio: '/static/audio/wordpool/CROSS.wav', word: "Cross"}, {audio: '/static/audio/wordpool/CROWN.wav', word: "Crown"}, {audio: '/static/audio/wordpool/CRUTCH.wav', word: "Crutch"}, {audio: '/static/audio/wordpool/CUPBOARD.wav', word: "Cupboard"}, {audio: '/static/audio/wordpool/CURTAIN.wav', word: "Curtain"}, {audio: '/static/audio/wordpool/CUSTARD.wav', word: "Custard"}, {audio: '/static/audio/wordpool/CYCLONE.wav', word: "Cyclone"}, {audio: '/static/audio/wordpool/DAISY.wav', word: "Daisy"}, {audio: '/static/audio/wordpool/DANCER.wav', word: "Dancer"}, {audio: '/static/audio/wordpool/DANDRUFF.wav', word: "Dandruff"}, {audio: '/static/audio/wordpool/DASHBOARD.wav', word: "Dashboard"}, {audio: '/static/audio/wordpool/DAUGHTER.wav', word: "Daughter"}, {audio: '/static/audio/wordpool/DENIM.wav', word: "Denim"}, {audio: '/static/audio/wordpool/DENTIST.wav', word: "Dentist"}, {audio: '/static/audio/wordpool/DIME.wav', word: "Dime"},
        {audio: '/static/audio/wordpool/DINER.wav', word: "Diner"}, {audio: '/static/audio/wordpool/DIVER.wav', word: "Diver"}, {audio: '/static/audio/wordpool/DOLPHIN.wav', word: "Dolphin"}, {audio: '/static/audio/wordpool/DONKEY.wav', word: "Donkey"}, {audio: '/static/audio/wordpool/DONOR.wav', word: "Donor"}, {audio: '/static/audio/wordpool/DORM.wav', word: "Dorm"}, {audio: '/static/audio/wordpool/DOUGHNUT.wav', word: "Doughnut"}, {audio: '/static/audio/wordpool/DRAGON.wav', word: "Dragon"}, {audio: '/static/audio/wordpool/DRAWING.wav', word: "Drawing"}, {audio: '/static/audio/wordpool/DRESS.wav', word: "Dress"}, {audio: '/static/audio/wordpool/DRESSER.wav', word: "Dresser"}, {audio: '/static/audio/wordpool/DRILL.wav', word: "Drill"}, {audio: '/static/audio/wordpool/DRINK.wav', word: "Drink"}, {audio: '/static/audio/wordpool/DRIVER.wav', word: "Driver"}, {audio: '/static/audio/wordpool/DRUG.wav', word: "Drug"}, {audio: '/static/audio/wordpool/DUST.wav', word: "Dust"}, {audio: '/static/audio/wordpool/DUSTPAN.wav', word: "Dustpan"}, {audio: '/static/audio/wordpool/EAGLE.wav', word: "Eagle"}, {audio: '/static/audio/wordpool/EGYPT.wav', word: "Egypt"}, {audio: '/static/audio/wordpool/ELBOW.wav', word: "Elbow"},
        {audio: '/static/audio/wordpool/EMPIRE.wav', word: "Empire"}, {audio: '/static/audio/wordpool/EUROPE.wav', word: "Europe"}, {audio: '/static/audio/wordpool/EXPERT.wav', word: "Expert"}, {audio: '/static/audio/wordpool/EYELASH.wav', word: "Eyelash"}, {audio: '/static/audio/wordpool/FARMER.wav', word: "Farmer"}, {audio: '/static/audio/wordpool/FEMALE.wav', word: "Female"}, {audio: '/static/audio/wordpool/FIDDLE.wav', word: "Fiddle"}, {audio: '/static/audio/wordpool/FILM.wav', word: "Film"}, {audio: '/static/audio/wordpool/FINGER.wav', word: "Finger"}, {audio: '/static/audio/wordpool/FIREMAN.wav', word: "Fireman"}, {audio: '/static/audio/wordpool/FIREPLACE.wav', word: "Fireplace"}, {audio: '/static/audio/wordpool/FLAG.wav', word: "Flag"}, {audio: '/static/audio/wordpool/FLASHLIGHT.wav', word: "Flashlight"}, {audio: '/static/audio/wordpool/FLASK.wav', word: "Flask"}, {audio: '/static/audio/wordpool/FLEET.wav', word: "Fleet"}, {audio: '/static/audio/wordpool/FLESH.wav', word: "Flesh"}, {audio: '/static/audio/wordpool/FLIPPER.wav', word: "Flipper"}, {audio: '/static/audio/wordpool/FLOWER.wav', word: "Flower"}, {audio: '/static/audio/wordpool/FLUTE.wav', word: "Flute"}, {audio: '/static/audio/wordpool/FOOT.wav', word: "Foot"},
        {audio: '/static/audio/wordpool/FOOTBALL.wav', word: "Football"}, {audio: '/static/audio/wordpool/FOREHEAD.wav', word: "Forehead"}, {audio: '/static/audio/wordpool/FOREST.wav', word: "Forest"}, {audio: '/static/audio/wordpool/FOX.wav', word: "Fox"}, {audio: '/static/audio/wordpool/FRAGRANCE.wav', word: "Fragrance"}, {audio: '/static/audio/wordpool/FRAME.wav', word: "Frame"}, {audio: '/static/audio/wordpool/FRANCE.wav', word: "France"}, {audio: '/static/audio/wordpool/FRECKLE.wav', word: "Freckle"}, {audio: '/static/audio/wordpool/FREEZER.wav', word: "Freezer"}, {audio: '/static/audio/wordpool/FRIEND.wav', word: "Friend"}, {audio: '/static/audio/wordpool/FRUIT.wav', word: "Fruit"}, {audio: '/static/audio/wordpool/FUNGUS.wav', word: "Fungus"}, {audio: '/static/audio/wordpool/GALLON.wav', word: "Gallon"}, {audio: '/static/audio/wordpool/GANGSTER.wav', word: "Gangster"}, {audio: '/static/audio/wordpool/GARBAGE.wav', word: "Garbage"}, {audio: '/static/audio/wordpool/GARDEN.wav', word: "Garden"}, {audio: '/static/audio/wordpool/GARLIC.wav', word: "Garlic"}, {audio: '/static/audio/wordpool/GAVEL.wav', word: "Gavel"}, {audio: '/static/audio/wordpool/GAZELLE.wav', word: "Gazelle"}, {audio: '/static/audio/wordpool/GHETTO.wav', word: "Ghetto"},
        {audio: '/static/audio/wordpool/GIFT.wav', word: "Gift"}, {audio: '/static/audio/wordpool/GIRL.wav', word: "Girl"}, {audio: '/static/audio/wordpool/GLASS.wav', word: "Glass"}, {audio: '/static/audio/wordpool/GLOBE.wav', word: "Globe"}, {audio: '/static/audio/wordpool/GLOVE.wav', word: "Glove"}, {audio: '/static/audio/wordpool/GOBLIN.wav', word: "Goblin"}, {audio: '/static/audio/wordpool/GRAPE.wav', word: "Grape"}, {audio: '/static/audio/wordpool/GRAVE.wav', word: "Grave"}, {audio: '/static/audio/wordpool/GRAVEL.wav', word: "Gravel"}, {audio: '/static/audio/wordpool/GRILL.wav', word: "Grill"}, {audio: '/static/audio/wordpool/GROUND.wav', word: "Ground"}, {audio: '/static/audio/wordpool/GUARD.wav', word: "Guard"}, {audio: '/static/audio/wordpool/GUITAR.wav', word: "Guitar"}, {audio: '/static/audio/wordpool/GYMNAST.wav', word: "Gymnast"}, {audio: '/static/audio/wordpool/HAMPER.wav', word: "Hamper"}, {audio: '/static/audio/wordpool/HAND.wav', word: "Hand"}, {audio: '/static/audio/wordpool/HANDBAG.wav', word: "Handbag"}, {audio: '/static/audio/wordpool/HARP.wav', word: "Harp"}, {audio: '/static/audio/wordpool/HATCHET.wav', word: "Hatchet"}, {audio: '/static/audio/wordpool/HAWK.wav', word: "Hawk"},
        {audio: '/static/audio/wordpool/HEADBAND.wav', word: "Headband"}, {audio: '/static/audio/wordpool/HEART.wav', word: "Heart"}, {audio: '/static/audio/wordpool/HEDGE.wav', word: "Hedge"}, {audio: '/static/audio/wordpool/HELMET.wav', word: "Helmet"}, {audio: '/static/audio/wordpool/HERO.wav', word: "Hero"}, {audio: '/static/audio/wordpool/HIGHWAY.wav', word: "Highway"}, {audio: '/static/audio/wordpool/HIKER.wav', word: "Hiker"}, {audio: '/static/audio/wordpool/HONEY.wav', word: "Honey"}, {audio: '/static/audio/wordpool/HOOD.wav', word: "Hood"}, {audio: '/static/audio/wordpool/HOOK.wav', word: "Hook"}, {audio: '/static/audio/wordpool/HORNET.wav', word: "Hornet"}, {audio: '/static/audio/wordpool/HOSTESS.wav', word: "Hostess"}, {audio: '/static/audio/wordpool/HOUND.wav', word: "Hound"}, {audio: '/static/audio/wordpool/HUMAN.wav', word: "Human"}, {audio: '/static/audio/wordpool/HUSBAND.wav', word: "Husband"}, {audio: '/static/audio/wordpool/ICEBERG.wav', word: "Iceberg"}, {audio: '/static/audio/wordpool/ICING.wav', word: "Icing"}, {audio: '/static/audio/wordpool/IGLOO.wav', word: "Igloo"}, {audio: '/static/audio/wordpool/INFANT.wav', word: "Infant"}, {audio: '/static/audio/wordpool/INMATE.wav', word: "Inmate"},
        {audio: '/static/audio/wordpool/ISLAND.wav', word: "Island"}, {audio: '/static/audio/wordpool/ITEM.wav', word: "Item"}, {audio: '/static/audio/wordpool/JAPAN.wav', word: "Japan"}, {audio: '/static/audio/wordpool/JELLO.wav', word: "Jello"}, {audio: '/static/audio/wordpool/JELLY.wav', word: "Jelly"}, {audio: '/static/audio/wordpool/JOURNAL.wav', word: "Journal"}, {audio: '/static/audio/wordpool/JUDGE.wav', word: "Judge"}, {audio: '/static/audio/wordpool/JUGGLER.wav', word: "Juggler"}, {audio: '/static/audio/wordpool/JUNGLE.wav', word: "Jungle"}, {audio: '/static/audio/wordpool/JURY.wav', word: "Jury"}, {audio: '/static/audio/wordpool/KEEPER.wav', word: "Keeper"}, {audio: '/static/audio/wordpool/KETCHUP.wav', word: "Ketchup"}, {audio: '/static/audio/wordpool/KIDNEY.wav', word: "Kidney"}, {audio: '/static/audio/wordpool/KITCHEN.wav', word: "Kitchen"}, {audio: '/static/audio/wordpool/KLEENEX.wav', word: "Kleenex"}, {audio: '/static/audio/wordpool/KNAPSACK.wav', word: "Knapsack"}, {audio: '/static/audio/wordpool/KNIFE.wav', word: "Knife"}, {audio: '/static/audio/wordpool/LABEL.wav', word: "Label"}, {audio: '/static/audio/wordpool/LACE.wav', word: "Lace"}, {audio: '/static/audio/wordpool/LADY.wav', word: "Lady"},
        {audio: '/static/audio/wordpool/LAGOON.wav', word: "Lagoon"}, {audio: '/static/audio/wordpool/LAKE.wav', word: "Lake"}, {audio: '/static/audio/wordpool/LAMP.wav', word: "Lamp"}, {audio: '/static/audio/wordpool/LAPEL.wav', word: "Lapel"}, {audio: '/static/audio/wordpool/LASER.wav', word: "Laser"}, {audio: '/static/audio/wordpool/LAVA.wav', word: "Lava"}, {audio: '/static/audio/wordpool/LEADER.wav', word: "Leader"}, {audio: '/static/audio/wordpool/LEG.wav', word: "Leg"}, {audio: '/static/audio/wordpool/LEOPARD.wav', word: "Leopard"}, {audio: '/static/audio/wordpool/LETTUCE.wav', word: "Lettuce"}, {audio: '/static/audio/wordpool/LIGHTNING.wav', word: "Lightning"}, {audio: '/static/audio/wordpool/LILY.wav', word: "Lily"}, {audio: '/static/audio/wordpool/LION.wav', word: "Lion"}, {audio: '/static/audio/wordpool/LIPSTICK.wav', word: "Lipstick"}, {audio: '/static/audio/wordpool/LIVER.wav', word: "Liver"}, {audio: '/static/audio/wordpool/LIZARD.wav', word: "Lizard"}, {audio: '/static/audio/wordpool/LODGE.wav', word: "Lodge"}, {audio: '/static/audio/wordpool/LOFT.wav', word: "Loft"}, {audio: '/static/audio/wordpool/LONDON.wav', word: "London"}, {audio: '/static/audio/wordpool/LOVER.wav', word: "Lover"},
        {audio: '/static/audio/wordpool/LUGGAGE.wav', word: "Luggage"}, {audio: '/static/audio/wordpool/LUMBER.wav', word: "Lumber"}, {audio: '/static/audio/wordpool/LUNCH.wav', word: "Lunch"}, {audio: '/static/audio/wordpool/MACHINE.wav', word: "Machine"}, {audio: '/static/audio/wordpool/MAILBOX.wav', word: "Mailbox"}, {audio: '/static/audio/wordpool/MAILMAN.wav', word: "Mailman"}, {audio: '/static/audio/wordpool/MAMMAL.wav', word: "Mammal"}, {audio: '/static/audio/wordpool/MAPLE.wav', word: "Maple"}, {audio: '/static/audio/wordpool/MARINE.wav', word: "Marine"}, {audio: '/static/audio/wordpool/MARKER.wav', word: "Marker"}, {audio: '/static/audio/wordpool/MARKET.wav', word: "Market"}, {audio: '/static/audio/wordpool/MARROW.wav', word: "Marrow"}, {audio: '/static/audio/wordpool/MARS.wav', word: "Mars"}, {audio: '/static/audio/wordpool/MARSH.wav', word: "Marsh"}, {audio: '/static/audio/wordpool/MASK.wav', word: "Mask"}, {audio: '/static/audio/wordpool/MATCH.wav', word: "Match"}, {audio: '/static/audio/wordpool/MATTRESS.wav', word: "Mattress"}, {audio: '/static/audio/wordpool/MESSAGE.wav', word: "Message"}, {audio: '/static/audio/wordpool/MILDEW.wav', word: "Mildew"}, {audio: '/static/audio/wordpool/MILK.wav', word: "Milk"},
        {audio: '/static/audio/wordpool/MISSILE.wav', word: "Missile"}, {audio: '/static/audio/wordpool/MISTER.wav', word: "Mister"}, {audio: '/static/audio/wordpool/MONEY.wav', word: "Money"}, {audio: '/static/audio/wordpool/MONSTER.wav', word: "Monster"}, {audio: '/static/audio/wordpool/MOP.wav', word: "Mop"}, {audio: '/static/audio/wordpool/MOTEL.wav', word: "Motel"}, {audio: '/static/audio/wordpool/MOTOR.wav', word: "Motor"}, {audio: '/static/audio/wordpool/MUFFIN.wav', word: "Muffin"}, {audio: '/static/audio/wordpool/MUMMY.wav', word: "Mummy"}, {audio: '/static/audio/wordpool/MUSTARD.wav', word: "Mustard"}, {audio: '/static/audio/wordpool/NAPKIN.wav', word: "Napkin"}, {audio: '/static/audio/wordpool/NECKLACE.wav', word: "Necklace"}, {audio: '/static/audio/wordpool/NEUTRON.wav', word: "Neutron"}, {audio: '/static/audio/wordpool/NIGHTGOWN.wav', word: "Nightgown"}, {audio: '/static/audio/wordpool/NOMAD.wav', word: "Nomad"}, {audio: '/static/audio/wordpool/NOTEBOOK.wav', word: "Notebook"}, {audio: '/static/audio/wordpool/NOVEL.wav', word: "Novel"}, {audio: '/static/audio/wordpool/NURSE.wav', word: "Nurse"}, {audio: '/static/audio/wordpool/OFFICE.wav', word: "Office"}, {audio: '/static/audio/wordpool/OINTMENT.wav', word: "Ointment"},
        {audio: '/static/audio/wordpool/OMELET.wav', word: "Omelet"}, {audio: '/static/audio/wordpool/ONION.wav', word: "Onion"}, {audio: '/static/audio/wordpool/ORANGE.wav', word: "Orange"}, {audio: '/static/audio/wordpool/ORCHID.wav', word: "Orchid"}, {audio: '/static/audio/wordpool/OUTDOORS.wav', word: "Outdoors"}, {audio: '/static/audio/wordpool/OUTFIT.wav', word: "Outfit"}, {audio: '/static/audio/wordpool/OUTLAW.wav', word: "Outlaw"}, {audio: '/static/audio/wordpool/OX.wav', word: "Ox"}, {audio: '/static/audio/wordpool/OYSTER.wav', word: "Oyster"}, {audio: '/static/audio/wordpool/OZONE.wav', word: "Ozone"}, {audio: '/static/audio/wordpool/PACKAGE.wav', word: "Package"}, {audio: '/static/audio/wordpool/PADDING.wav', word: "Padding"}, {audio: '/static/audio/wordpool/PADDLE.wav', word: "Paddle"}, {audio: '/static/audio/wordpool/PALACE.wav', word: "Palace"}, {audio: '/static/audio/wordpool/PANTHER.wav', word: "Panther"}, {audio: '/static/audio/wordpool/PAPER.wav', word: "Paper"}, {audio: '/static/audio/wordpool/PARENT.wav', word: "Parent"}, {audio: '/static/audio/wordpool/PARROT.wav', word: "Parrot"}, {audio: '/static/audio/wordpool/PARSLEY.wav', word: "Parsley"}, {audio: '/static/audio/wordpool/PARTNER.wav', word: "Partner"},
        {audio: '/static/audio/wordpool/PASSAGE.wav', word: "Passage"}, {audio: '/static/audio/wordpool/PASTA.wav', word: "Pasta"}, {audio: '/static/audio/wordpool/PASTRY.wav', word: "Pastry"}, {audio: '/static/audio/wordpool/PATIENT.wav', word: "Patient"}, {audio: '/static/audio/wordpool/PATROL.wav', word: "Patrol"}, {audio: '/static/audio/wordpool/PEACH.wav', word: "Peach"}, {audio: '/static/audio/wordpool/PEANUT.wav', word: "Peanut"}, {audio: '/static/audio/wordpool/PEBBLE.wav', word: "Pebble"}, {audio: '/static/audio/wordpool/PECAN.wav', word: "Pecan"}, {audio: '/static/audio/wordpool/PENGUIN.wav', word: "Penguin"}, {audio: '/static/audio/wordpool/PEPPER.wav', word: "Pepper"}, {audio: '/static/audio/wordpool/PERCH.wav', word: "Perch"}, {audio: '/static/audio/wordpool/PERFUME.wav', word: "Perfume"}, {audio: '/static/audio/wordpool/PERMIT.wav', word: "Permit"}, {audio: '/static/audio/wordpool/PIANO.wav', word: "Piano"}, {audio: '/static/audio/wordpool/PICNIC.wav', word: "Picnic"}, {audio: '/static/audio/wordpool/PICTURE.wav', word: "Picture"}, {audio: '/static/audio/wordpool/PIGEON.wav', word: "Pigeon"}, {audio: '/static/audio/wordpool/PIGMENT.wav', word: "Pigment"}, {audio: '/static/audio/wordpool/PILOT.wav', word: "Pilot"},
        {audio: '/static/audio/wordpool/PIMPLE.wav', word: "Pimple"}, {audio: '/static/audio/wordpool/PISTOL.wav', word: "Pistol"}, {audio: '/static/audio/wordpool/PISTON.wav', word: "Piston"}, {audio: '/static/audio/wordpool/PIZZA.wav', word: "Pizza"}, {audio: '/static/audio/wordpool/PLAID.wav', word: "Plaid"}, {audio: '/static/audio/wordpool/PLASTER.wav', word: "Plaster"}, {audio: '/static/audio/wordpool/PLATE.wav', word: "Plate"}, {audio: '/static/audio/wordpool/PLAYGROUND.wav', word: "Playground"}, {audio: '/static/audio/wordpool/PLAZA.wav', word: "Plaza"}, {audio: '/static/audio/wordpool/PLIERS.wav', word: "Pliers"}, {audio: '/static/audio/wordpool/PLUTO.wav', word: "Pluto"}, {audio: '/static/audio/wordpool/POCKET.wav', word: "Pocket"}, {audio: '/static/audio/wordpool/POET.wav', word: "Poet"}, {audio: '/static/audio/wordpool/POISON.wav', word: "Poison"}, {audio: '/static/audio/wordpool/POLICE.wav', word: "Police"}, {audio: '/static/audio/wordpool/POPCORN.wav', word: "Popcorn"}, {audio: '/static/audio/wordpool/PORK.wav', word: "Pork"}, {audio: '/static/audio/wordpool/PORTRAIT.wav', word: "Portrait"}, {audio: '/static/audio/wordpool/POSSUM.wav', word: "Possum"}, {audio: '/static/audio/wordpool/POSTAGE.wav', word: "Postage"},
        {audio: '/static/audio/wordpool/POWDER.wav', word: "Powder"}, {audio: '/static/audio/wordpool/PREACHER.wav', word: "Preacher"}, {audio: '/static/audio/wordpool/PRIMATE.wav', word: "Primate"}, {audio: '/static/audio/wordpool/PRINCESS.wav', word: "Princess"}, {audio: '/static/audio/wordpool/PROTON.wav', word: "Proton"}, {audio: '/static/audio/wordpool/PUDDING.wav', word: "Pudding"}, {audio: '/static/audio/wordpool/PUDDLE.wav', word: "Puddle"}, {audio: '/static/audio/wordpool/PUPPY.wav', word: "Puppy"}, {audio: '/static/audio/wordpool/QUAIL.wav', word: "Quail"}, {audio: '/static/audio/wordpool/QUARTER.wav', word: "Quarter"}, {audio: '/static/audio/wordpool/QUEEN.wav', word: "Queen"}, {audio: '/static/audio/wordpool/RABBIT.wav', word: "Rabbit"}, {audio: '/static/audio/wordpool/RACKET.wav', word: "Racket"}, {audio: '/static/audio/wordpool/RADISH.wav', word: "Radish"}, {audio: '/static/audio/wordpool/RAFT.wav', word: "Raft"}, {audio: '/static/audio/wordpool/RATTLE.wav', word: "Rattle"}, {audio: '/static/audio/wordpool/RAZOR.wav', word: "Razor"}, {audio: '/static/audio/wordpool/REBEL.wav', word: "Rebel"}, {audio: '/static/audio/wordpool/RECEIPT.wav', word: "Receipt"}, {audio: '/static/audio/wordpool/RECORD.wav', word: "Record"},
        {audio: '/static/audio/wordpool/RELISH.wav', word: "Relish"}, {audio: '/static/audio/wordpool/REPORT.wav', word: "Report"}, {audio: '/static/audio/wordpool/RIFLE.wav', word: "Rifle"}, {audio: '/static/audio/wordpool/RIVER.wav', word: "River"}, {audio: '/static/audio/wordpool/ROBBER.wav', word: "Robber"}, {audio: '/static/audio/wordpool/ROBIN.wav', word: "Robin"}, {audio: '/static/audio/wordpool/ROBOT.wav', word: "Robot"}, {audio: '/static/audio/wordpool/ROCKET.wav', word: "Rocket"}, {audio: '/static/audio/wordpool/ROD.wav', word: "Rod"}, {audio: '/static/audio/wordpool/ROOSTER.wav', word: "Rooster"}, {audio: '/static/audio/wordpool/RUG.wav', word: "Rug"}, {audio: '/static/audio/wordpool/RUST.wav', word: "Rust"}, {audio: '/static/audio/wordpool/SADDLE.wav', word: "Saddle"}, {audio: '/static/audio/wordpool/SALAD.wav', word: "Salad"}, {audio: '/static/audio/wordpool/SALMON.wav', word: "Salmon"}, {audio: '/static/audio/wordpool/SALT.wav', word: "Salt"}, {audio: '/static/audio/wordpool/SANDWICH.wav', word: "Sandwich"}, {audio: '/static/audio/wordpool/SAUSAGE.wav', word: "Sausage"}, {audio: '/static/audio/wordpool/SCALLOP.wav', word: "Scallop"}, {audio: '/static/audio/wordpool/SCALPEL.wav', word: "Scalpel"},
        {audio: '/static/audio/wordpool/SCARECROW.wav', word: "Scarecrow"}, {audio: '/static/audio/wordpool/SCARF.wav', word: "Scarf"}, {audio: '/static/audio/wordpool/SCISSORS.wav', word: "Scissors"}, {audio: '/static/audio/wordpool/SCOTCH.wav', word: "Scotch"}, {audio: '/static/audio/wordpool/SCRIBBLE.wav', word: "Scribble"}, {audio: '/static/audio/wordpool/SCULPTURE.wav', word: "Sculpture"}, {audio: '/static/audio/wordpool/SEAFOOD.wav', word: "Seafood"}, {audio: '/static/audio/wordpool/SEAGULL.wav', word: "Seagull"}, {audio: '/static/audio/wordpool/SEAL.wav', word: "Seal"}, {audio: '/static/audio/wordpool/SERVANT.wav', word: "Servant"}, {audio: '/static/audio/wordpool/SERVER.wav', word: "Server"}, {audio: '/static/audio/wordpool/SHARK.wav', word: "Shark"}, {audio: '/static/audio/wordpool/SHELF.wav', word: "Shelf"}, {audio: '/static/audio/wordpool/SHELTER.wav', word: "Shelter"}, {audio: '/static/audio/wordpool/SHERIFF.wav', word: "Sheriff"}, {audio: '/static/audio/wordpool/SHIRT.wav', word: "Shirt"}, {audio: '/static/audio/wordpool/SHORTCAKE.wav', word: "Shortcake"}, {audio: '/static/audio/wordpool/SHORTS.wav', word: "Shorts"}, {audio: '/static/audio/wordpool/SHOULDER.wav', word: "Shoulder"}, {audio: '/static/audio/wordpool/SHOVEL.wav', word: "Shovel"},
        {audio: '/static/audio/wordpool/SHRUB.wav', word: "Shrub"}, {audio: '/static/audio/wordpool/SIBLING.wav', word: "Sibling"}, {audio: '/static/audio/wordpool/SIDEWALK.wav', word: "Sidewalk"}, {audio: '/static/audio/wordpool/SILK.wav', word: "Silk"}, {audio: '/static/audio/wordpool/SISTER.wav', word: "Sister"}, {audio: '/static/audio/wordpool/SKETCH.wav', word: "Sketch"}, {audio: '/static/audio/wordpool/SKILLET.wav', word: "Skillet"}, {audio: '/static/audio/wordpool/SKIRT.wav', word: "Skirt"}, {audio: '/static/audio/wordpool/SLIDE.wav', word: "Slide"}, {audio: '/static/audio/wordpool/SLIME.wav', word: "Slime"}, {audio: '/static/audio/wordpool/SLOPE.wav', word: "Slope"}, {audio: '/static/audio/wordpool/SLUG.wav', word: "Slug"}, {audio: '/static/audio/wordpool/SMOG.wav', word: "Smog"}, {audio: '/static/audio/wordpool/SNACK.wav', word: "Snack"}, {audio: '/static/audio/wordpool/SNAIL.wav', word: "Snail"}, {audio: '/static/audio/wordpool/SNAKE.wav', word: "Snake"}, {audio: '/static/audio/wordpool/SODA.wav', word: "Soda"}, {audio: '/static/audio/wordpool/SOFTBALL.wav', word: "Softball"}, {audio: '/static/audio/wordpool/SPACE.wav', word: "Space"}, {audio: '/static/audio/wordpool/SPARROW.wav', word: "Sparrow"},
        {audio: '/static/audio/wordpool/SPHINX.wav', word: "Sphinx"}, {audio: '/static/audio/wordpool/SPIDER.wav', word: "Spider"}, {audio: '/static/audio/wordpool/SPONGE.wav', word: "Sponge"}, {audio: '/static/audio/wordpool/SPOOL.wav', word: "Spool"}, {audio: '/static/audio/wordpool/SPOON.wav', word: "Spoon"}, {audio: '/static/audio/wordpool/SPOUSE.wav', word: "Spouse"}, {audio: '/static/audio/wordpool/STALLION.wav', word: "Stallion"}, {audio: '/static/audio/wordpool/STAMP.wav', word: "Stamp"}, {audio: '/static/audio/wordpool/STAPLE.wav', word: "Staple"}, {audio: '/static/audio/wordpool/STAR.wav', word: "Star"}, {audio: '/static/audio/wordpool/STATUE.wav', word: "Statue"}, {audio: '/static/audio/wordpool/STICKER.wav', word: "Sticker"}, {audio: '/static/audio/wordpool/STOMACH.wav', word: "Stomach"}, {audio: '/static/audio/wordpool/STONE.wav', word: "Stone"}, {audio: '/static/audio/wordpool/STOVE.wav', word: "Stove"}, {audio: '/static/audio/wordpool/STREAM.wav', word: "Stream"}, {audio: '/static/audio/wordpool/STUDENT.wav', word: "Student"}, {audio: '/static/audio/wordpool/SUBWAY.wav', word: "Subway"}, {audio: '/static/audio/wordpool/SUITCASE.wav', word: "Suitcase"}, {audio: '/static/audio/wordpool/SUMMIT.wav', word: "Summit"},
        {audio: '/static/audio/wordpool/SUNRISE.wav', word: "Sunrise"}, {audio: '/static/audio/wordpool/SUNSET.wav', word: "Sunset"}, {audio: '/static/audio/wordpool/SUPPER.wav', word: "Supper"}, {audio: '/static/audio/wordpool/SURVEY.wav', word: "Survey"}, {audio: '/static/audio/wordpool/SUSPECT.wav', word: "Suspect"}, {audio: '/static/audio/wordpool/SWAMP.wav', word: "Swamp"}, {audio: '/static/audio/wordpool/SWIMMER.wav', word: "Swimmer"}, {audio: '/static/audio/wordpool/SWITCH.wav', word: "Switch"}, {audio: '/static/audio/wordpool/SWORD.wav', word: "Sword"}, {audio: '/static/audio/wordpool/TABLE.wav', word: "Table"}, {audio: '/static/audio/wordpool/TABLET.wav', word: "Tablet"}, {audio: '/static/audio/wordpool/TART.wav', word: "Tart"}, {audio: '/static/audio/wordpool/TAXI.wav', word: "Taxi"}, {audio: '/static/audio/wordpool/TEACHER.wav', word: "Teacher"}, {audio: '/static/audio/wordpool/TEMPLE.wav', word: "Temple"}, {audio: '/static/audio/wordpool/TERMITE.wav', word: "Termite"}, {audio: '/static/audio/wordpool/THIEF.wav', word: "Thief"}, {audio: '/static/audio/wordpool/THREAD.wav', word: "Thread"}, {audio: '/static/audio/wordpool/TILE.wav', word: "Tile"}, {audio: '/static/audio/wordpool/TOASTER.wav', word: "Toaster"},
        {audio: '/static/audio/wordpool/TOMBSTONE.wav', word: "Tombstone"}, {audio: '/static/audio/wordpool/TORTOISE.wav', word: "Tortoise"}, {audio: '/static/audio/wordpool/TOURIST.wav', word: "Tourist"}, {audio: '/static/audio/wordpool/TRACTOR.wav', word: "Tractor"}, {audio: '/static/audio/wordpool/TRANSPLANT.wav', word: "Transplant"}, {audio: '/static/audio/wordpool/TREAT.wav', word: "Treat"}, {audio: '/static/audio/wordpool/TRENCH.wav', word: "Trench"}, {audio: '/static/audio/wordpool/TRIBE.wav', word: "Tribe"}, {audio: '/static/audio/wordpool/TROMBONE.wav', word: "Trombone"}, {audio: '/static/audio/wordpool/TROUT.wav', word: "Trout"}, {audio: '/static/audio/wordpool/TRUCK.wav', word: "Truck"}, {audio: '/static/audio/wordpool/TUBA.wav', word: "Tuba"}, {audio: '/static/audio/wordpool/TUNNEL.wav', word: "Tunnel"}, {audio: '/static/audio/wordpool/TURKEY.wav', word: "Turkey"}, {audio: '/static/audio/wordpool/TURNIP.wav', word: "Turnip"}, {audio: '/static/audio/wordpool/TURTLE.wav', word: "Turtle"}, {audio: '/static/audio/wordpool/TUTU.wav', word: "Tutu"}, {audio: '/static/audio/wordpool/TWEEZERS.wav', word: "Tweezers"}, {audio: '/static/audio/wordpool/TWIG.wav', word: "Twig"}, {audio: '/static/audio/wordpool/TWISTER.wav', word: "Twister"},
        {audio: '/static/audio/wordpool/TYPIST.wav', word: "Typist"}, {audio: '/static/audio/wordpool/ULCER.wav', word: "Ulcer"}, {audio: '/static/audio/wordpool/UMPIRE.wav', word: "Umpire"}, {audio: '/static/audio/wordpool/UNCLE.wav', word: "Uncle"}, {audio: '/static/audio/wordpool/VAGRANT.wav', word: "vagrant"}, {audio: '/static/audio/wordpool/VALLEY.wav', word: "Valley"}, {audio: '/static/audio/wordpool/VALVE.wav', word: "Valve"}, {audio: '/static/audio/wordpool/VELVET.wav', word: "Velvet"}, {audio: '/static/audio/wordpool/VENUS.wav', word: "Venus"}, {audio: '/static/audio/wordpool/VICTIM.wav', word: "Victim"}, {audio: '/static/audio/wordpool/VIKING.wav', word: "Viking"}, {audio: '/static/audio/wordpool/VIRUS.wav', word: "Virus"}, {audio: '/static/audio/wordpool/WAGON.wav', word: "Wagon"}, {audio: '/static/audio/wordpool/WAITER.wav', word: "Waiter"}, {audio: '/static/audio/wordpool/WAITRESS.wav', word: "Waitress"}, {audio: '/static/audio/wordpool/WARDROBE.wav', word: "Wardrobe"}, {audio: '/static/audio/wordpool/WASHER.wav', word: "Washer"}, {audio: '/static/audio/wordpool/WASP.wav', word: "Wasp"}, {audio: '/static/audio/wordpool/WHISKERS.wav', word: "Whiskers"}, {audio: '/static/audio/wordpool/WHISTLE.wav', word: "Whistle"},
        {audio: '/static/audio/wordpool/WIDOW.wav', word: "Widow"}, {audio: '/static/audio/wordpool/WIFE.wav', word: "Wife"}, {audio: '/static/audio/wordpool/WINDOW.wav', word: "Window"}, {audio: '/static/audio/wordpool/WITNESS.wav', word: "Witness"}, {audio: '/static/audio/wordpool/WOMAN.wav', word: "Woman"}, {audio: '/static/audio/wordpool/WORKER.wav', word: 'Worker'}, {audio: '/static/audio/wordpool/WORLD.wav', word: "World"}, {audio: '/static/audio/wordpool/WRENCH.wav', word: "Wrench"}, {audio: '/static/audio/wordpool/WRIST.wav', word: "Wrist"}, {audio: '/static/audio/wordpool/XEROX.wav', word: "Xerox"}, {audio: '/static/audio/wordpool/YACHT.wav', word: "Yacht"}, {audio: '/static/audio/wordpool/YARN.wav', word: "Yarn"}, {audio: '/static/audio/wordpool/ZEBRA.wav', word: "Zebra"}, {audio: '/static/audio/wordpool/ZIPPER.wav', word: "Zipper"}
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
    var att_recall = {
        type: 'survey-text',
        questions: [
            {prompt: "<p>Recall the words you just heard in any order.</p> \
            <p> Press the Enter key or the Continue button to submit each word.</p>"}
        ],
        trial_duration: 10000,       // 10 seconds per recall -- not working
        post_trial_gap: 1,
        data: {type: 'ATT_REC'},
        on_finish: function(data){
            var att_recalled = data.response.Q0.toString().toLowerCase();
            if (att_list.indexOf(att_recalled) > -1){
                att_correct++;
            };
            att_trials++;
        }
    };
    
    var att_rec_period = {
        timeline: [att_recall],
        loop_function: function(){
            if(att_trials < 5){
                return true;
            } else {
                return false;
            }
        }
    };
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
        <p>Based on your responses to these questions, we ask that you return this HIT to MTurk at this time.</p>"
    };

    var pass_node = {
        timeline: [pass_att],
        conditional_function: function(){
            if (att_correct >= 3){
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
            if (att_correct == 2){
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
            if (att_correct < 2){
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
        on_finish: function(){
            psiturk.finishInstructions();
        }
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
        stimulus: "<p>You will now have 90 seconds to recall the \
            words you just were presented in any order.</p><p>Type into the box \
            and press the Enter key for each word.</p><p>Press the Start Recall\
            button to begin recall.</p>",
        choices: ["Start Recall"],
        post_trial_gap: 500
    };

    //serial position of recalled word (88 = intrusion, null entry when recall times out)
    var srposR = 88;
    //array of recalled words
    var rec_words = [];
    //array of serial positions of recalled words
    var ser_pos = [];
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
        data: {type: 'REC_WORD', list: curr_list},
        on_finish: function(data){
            var recalled = data.response.Q0.toString().toLowerCase();
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
            ser_pos = [];
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
            timeline.push(recall_timer);
            timeline.push(recall_period);
            timeline.push(ready);
        } else {
            timeline.push(hold_keys_instructions);
            timeline.push(sound_tone);
            timeline.push(list_presentation);
            timeline.push(recall_timer);
            timeline.push(recall_period);
            timeline.push(notes);
            timeline.push(final_page);
        }
    };

    var error_message = "<h1>Oops!</h1><p>Something went wrong submitting your HIT. This might happen if you lose your internet connection. Do not reload the page.</p>"

    prompt_resubmit = function() {
        document.body.innerHTMK = error_message;
        $("#resubmit").click(resubmit);
    };

    resubmit = function() {
        document.body.innerHTML = "<h1>Trying to resubmit...</h1>";
        reprompt = setTimeout(prompt_resubmit, 10000);

        psiTurk.saveData({
            success: function() {
                clearInterval(reprompt);
                psiTurk.completeHIT()
            },
            error: prompt_resubmit
        });
    };
    

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
        on_finish: function() {
            jsPsych.data.addProperties({condition: condition_row, l_length: list_length, pres_rate: presentation_rate, num_lists: num_lists, session: 3, replays: tot_replays, worker_id: workerId});
            //jsPsych.data.get().localSave('json', 'myHCMdata.json');
            psiturk.saveData({
                success: function() { psiturk.completeHIT(); },
                error: prompt_resubmit
            });
        },
        on_data_update: function(data) {
            psiturk.recordTrialData(data);
            psiturk.saveData();
        }
    });
}

//runExperiment();