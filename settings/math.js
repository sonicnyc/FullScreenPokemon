FullScreenPokemon.prototype.settings.math = {
    "equations": {
        "newPokemon": function (NumberMaker, constants, equations, title, level, moves, iv, ev) {
            var statisticNames = constants.statisticNames,
                pokemon = {
                    "title": title,
                    "level": level,
                    "moves": moves || this.compute("newPokemonMoves", title, level),
                    "IV": iv || this.compute("newPokemonIVs"),
                    "EV": ev || this.compute("newPokemonEVs")
                },
                i;

            for (i = 0; i < statisticNames.length; i += 1) {
                pokemon[statisticNames[i]] = this.compute(
                    "pokemonStatistic", pokemon, statisticNames[i]
                );
            }

            return pokemon;
        },
        // http://bulbapedia.bulbagarden.net/wiki/XXXXXXX_(Pok%C3%A9mon)/Generation_I_learnset
        "newPokemonMoves": function (NumberMaker, constants, equations, title, level) {
            var possibilities = constants.pokemon[title].moves.natural,
                output = [],
                move, end, i;

            for (end = 0; end < possibilities.length; end += 1) {
                if (possibilities[end].level > level) {
                    break;
                }
            }

            for (i = Math.max(end - 4, 0); i < end; i += 1) {
                move = possibilities[i];
                output.push({
                    "title": move.move,
                    "PP": move.PP
                })
            }

            return output;
        },
        // http://bulbapedia.bulbagarden.net/wiki/Individual_values
        "newPokemonIVs": function (NumberMaker, constants, equations) {
            var attack = NumberMaker.randomIntWithin(0, 15),
                defense = NumberMaker.randomIntWithin(0, 15),
                speed = NumberMaker.randomIntWithin(0, 15),
                special = NumberMaker.randomIntWithin(0, 15),
                output = {
                    "Attack": attack,
                    "Defense": defense,
                    "Speed": speed,
                    "Special": special
                };

            output["HP"] = (
                8 * (attack % 2)
                + 4 * (defense % 2)
                + 2 * (speed % 2)
                + (special % 2)
            );

            return output;
        },
        "newPokemonEVs": function (NumberMaker, constants, equations) {
            return {
                "Attack": 0,
                "Defense": 0,
                "Speed": 0,
                "Special": 0
            }
        },
        // http://bulbapedia.bulbagarden.net/wiki/Individual_values
        // Note: the page mentions rounding errors... 
        "pokemonStatistic": function (NumberMaker, constants, equations, pokemon, statistic) {
            var topExtra = 0,
                added = 5,
                base = constants.pokemon[pokemon.title][statistic],
                iv = pokemon.IV[statistic] || 0,
                ev = pokemon.EV[statistic] || 0,
                level = pokemon.level,
                numerator;

            if (statistic === "HP") {
                topExtra = 50;
                added = 10;
            }

            numerator = (iv + base + (Math.sqrt(ev) / 8) + topExtra) * level;

            return (numerator / 50 + added) | 0;
        },
        // http://bulbapedia.bulbagarden.net/wiki/Tall_grass
        "doesGrassEncounterHappen": function (NumberMaker, constants, equations, grass) {
            return NumberMaker.randomBooleanFraction(grass.rarity, 187.5);
        },
        // http://bulbapedia.bulbagarden.net/wiki/Catch_rate#Capture_method_.28Generation_I.29
        "canCatchPokemon": function (NumberMaker, constants, equations, pokemon, ball) {
            var n, m, f;

            // 1. If a Master Ball is used, the Pokemon is caught.
            if (ball.type === "Master") {
                return true;
            }

            // 2. Generate a random number, N, depending on the type of ball used.
            n = NumberMaker.randomInt(ball.probabilityMax);

            // 3. The Pokemon is caught if...
            if (pokemon.status) {
                // ... it is asleep or frozen and N is less than 25.
                if (n < 25) {
                    if (constants.statuses.probability25[pokemon.status]) {
                        return true;
                    }
                }
                    // ... it is paralyzed, burned, or poisoned and N is less than 12.
                else if (n < 12) {
                    if (constants.statuses.probability12[pokemon.status]) {
                        return true;
                    }
                }
            }

            // 4. Otherwise, if N minus the status value is greater than the Pokemon's catch rate, the Pokemon breaks free.
            if (n - constants.statuses.levels[pokemon.status] > pokemon.catchRate) {
                return false;
            }

            // 5. If not, generate a random value, M, between 0 and 255.
            m = NumberMaker.randomInt(255);

            // 6. Calculate f.
            f = Math.max(
                Math.min(
                    (pokemon.hpMax * 255 * 4) | 0 / (pokemon.hpCurrent * ball.rate) | 0,
                    255
                ),
                1
            );

            // 7. If f is greater than or equal to M, the Pokemon is caught. Otherwise, the Pokemon breaks free.
            return f > m;
        },
        // http://bulbapedia.bulbagarden.net/wiki/Escape#Generation_I_and_II
        "canEscapePokemon": function (NumberMaker, constants, equations, pokemon, enemy, battleInfo) {
            var a = pokemon.speed,
                b = (enemy.speed / 4) % 256,
                c = battleInfo.currentEscapeAttempts,
                f = NumberMaker.randomBooleanProbability((a * 32) / b + 30 * c);

            if (f > 255 || b === 0) {
                return true;
            }

            return NumberMaker.randomInt(256) < f;
        },
        // http://bulbapedia.bulbagarden.net/wiki/Catch_rate#Capture_method_.28Generation_I.29
        "numBallShakes": function (NumberMaker, constants, equations, pokemon, ball) {
            // 1. Calculate d.
            var d = pokemon.rate * 100 / ball.rate,
                f, x;

            // 2. If d is greater than or equal to 256, the ball shakes three times before the Pokemon breaks free.
            if (d >= 256) {
                return 3;
            }

            // 3. If not, calculate x = d * f / 255 + s, where s is 10 if the Pokemon is asleep or frozen or 5 if it is paralyzed, poisoned, or burned.
            f = Math.max(
                Math.min(
                    (pokemon.hpMax * 255 * 4) | 0 / (pokemon.hpCurrent * ball.rate) | 0,
                    255
                ),
                1
            );
            x = d * f / 255 + constants.statuses.shaking[pokemon.status];

            // 4. If... 
            // x < 10: the Ball misses the Pokemon completely.
            if (x < 10) {
                return 0;
            }
                // x < 30: the Ball shakes once before the Pokemon breaks free.
            else if (x < 30) {
                return 1;
            }
                // x < 70: the Ball shakes twice before the Pokemon breaks free.
            else if (x < 70) {
                return 2;
            }
                // Otherwise, the Ball shakes three times before the Pokemon breaks free.
            else {
                return 3;
            }
        }
    },
    "constants": {
        "statuses": {
            "names": ["Sleep", "Freeze", "Paralyze", "Burn", "Poison"],
            "probability25": {
                "Sleep": true,
                "Freeze": true
            },
            "probability12": {
                "Paralyze": true,
                "Burn": true,
                "Poison": true
            },
            // where to get?
            "levels": {
                "Normal": -1,
                "Sleep": -1,
                "Freeze": -1,
                "Paralyze": -1,
                "Burn": -1,
                "Poison": -1
            },
            "shaking": {
                "Normal": 0,
                "Sleep": 10,
                "Freeze": 10,
                "Paralyze": 5,
                "Burn": 5,
                "Poison": 5
            }
        },
        /**
         * Run on http://www.smogon.com/dex/rb/pokemon/
         * 
         * var output = {};
         * 
         * Array.prototype.slice.call(document.querySelectorAll("tr")).forEach(function (row) {
         *     output[row.children[0].innerText.trim()] = {
         *         "types": row.children[1].innerText.split(/\s+/g)
         *             .filter(function (str) { return str; })
         *             .map(function (str) { return str.trim(); }),
         *         "HP": Number(row.children[5].innerText.split(/\s+/g)[1]),
         *         "Attack": Number(row.children[6].innerText.split(/\s+/g)[1]),
         *         "Defense": Number(row.children[7].innerText.split(/\s+/g)[1]),
         *         "Special": Number(row.children[8].innerText.split(/\s+/g)[1]),
         *         "Speed": Number(row.children[10].innerText.split(/\s+/g)[1]),
         *     };
         * });
         * 
         * JSON.stringify(output);
         */
        "pokemon": {
            "Abra": {
                "types": ["Psychic"],
                "HP": 25,
                "Attack": 20,
                "Defense": 15,
                "Special": 105,
                "Speed": 90
            },
            "Aerodactyl": {
                "types": ["Flying", "Rock"],
                "HP": 80,
                "Attack": 105,
                "Defense": 65,
                "Special": 60,
                "Speed": 130
            },
            "Alakazam": {
                "types": ["Psychic"],
                "HP": 55,
                "Attack": 50,
                "Defense": 45,
                "Special": 135,
                "Speed": 120
            },
            "Arbok": {
                "types": ["Poison"],
                "HP": 60,
                "Attack": 85,
                "Defense": 69,
                "Special": 65,
                "Speed": 80
            },
            "Arcanine": {
                "types": ["Fire"],
                "HP": 90,
                "Attack": 110,
                "Defense": 80,
                "Special": 80,
                "Speed": 95
            },
            "Articuno": {
                "types": ["Flying", "Ice"],
                "HP": 90,
                "Attack": 85,
                "Defense": 100,
                "Special": 125,
                "Speed": 85
            },
            "Beedrill": {
                "types": ["Bug", "Poison"],
                "HP": 65,
                "Attack": 80,
                "Defense": 40,
                "Special": 45,
                "Speed": 75
            },
            "Bellsprout": {
                "types": ["Grass", "Poison"],
                "HP": 50,
                "Attack": 75,
                "Defense": 35,
                "Special": 70,
                "Speed": 40
            },
            "Blastoise": {
                "types": ["Water"],
                "HP": 79,
                "Attack": 83,
                "Defense": 100,
                "Special": 85,
                "Speed": 78
            },
            "Bulbasaur": {
                "types": ["Grass", "Poison"],
                "HP": 45,
                "Attack": 49,
                "Defense": 49,
                "Special": 65,
                "Speed": 45,
                "moves": {
                    "natural": [
                        {
                            "level": 0,
                            "move": "Tackle"
                        }, {
                            "level": 0,
                            "move": "Growl"
                        }, {
                            "level": 7,
                            "move": "Leech Seed"
                        }, {
                            "level": 13,
                            "move": "Vine Whip"
                        }, {
                            "level": 20,
                            "move": "PoisonPowder"
                        }, {
                            "level": 27,
                            "move": "Razor Leaf"
                        }, {
                            "level": 34,
                            "move": "Grown"
                        }, {
                            "level": 41,
                            "move": "Sleep Powder"
                        }, {
                            "level": 48,
                            "move": "SolarBeam"
                        }
                    ]
                }
            },
            "Butterfree": {
                "types": ["Bug", "Flying"],
                "HP": 60,
                "Attack": 45,
                "Defense": 50,
                "Special": 80,
                "Speed": 70
            },
            "Caterpie": {
                "types": ["Bug"],
                "HP": 45,
                "Attack": 30,
                "Defense": 35,
                "Special": 20,
                "Speed": 45
            },
            "Chansey": {
                "types": ["Normal"],
                "HP": 250,
                "Attack": 5,
                "Defense": 5,
                "Special": 105,
                "Speed": 50
            },
            "Charizard": {
                "types": ["Fire", "Flying"],
                "HP": 78,
                "Attack": 84,
                "Defense": 78,
                "Special": 85,
                "Speed": 100
            },
            "Charmander": {
                "types": ["Fire"],
                "HP": 39,
                "Attack": 52,
                "Defense": 43,
                "Special": 50,
                "Speed": 65
            },
            "Charmeleon": {
                "types": ["Fire"],
                "HP": 58,
                "Attack": 64,
                "Defense": 58,
                "Special": 65,
                "Speed": 80
            },
            "Clefable": {
                "types": ["Normal"],
                "HP": 95,
                "Attack": 70,
                "Defense": 73,
                "Special": 85,
                "Speed": 60
            },
            "Clefairy": {
                "types": ["Normal"],
                "HP": 70,
                "Attack": 45,
                "Defense": 48,
                "Special": 60,
                "Speed": 35
            },
            "Cloyster": {
                "types": ["Ice", "Water"],
                "HP": 50,
                "Attack": 95,
                "Defense": 180,
                "Special": 85,
                "Speed": 70
            },
            "Cubone": {
                "types": ["Ground"],
                "HP": 50,
                "Attack": 50,
                "Defense": 95,
                "Special": 40,
                "Speed": 35
            },
            "Dewgong": {
                "types": ["Ice", "Water"],
                "HP": 90,
                "Attack": 70,
                "Defense": 80,
                "Special": 95,
                "Speed": 70
            },
            "Diglett": {
                "types": ["Ground"],
                "HP": 10,
                "Attack": 55,
                "Defense": 25,
                "Special": 45,
                "Speed": 95
            },
            "Ditto": {
                "types": ["Normal"],
                "HP": 48,
                "Attack": 48,
                "Defense": 48,
                "Special": 48,
                "Speed": 48
            },
            "Dodrio": {
                "types": ["Flying", "Normal"],
                "HP": 60,
                "Attack": 110,
                "Defense": 70,
                "Special": 60,
                "Speed": 100
            },
            "Doduo": {
                "types": ["Flying", "Normal"],
                "HP": 35,
                "Attack": 85,
                "Defense": 45,
                "Special": 35,
                "Speed": 75
            },
            "Dragonair": {
                "types": ["Dragon"],
                "HP": 61,
                "Attack": 84,
                "Defense": 65,
                "Special": 70,
                "Speed": 70
            },
            "Dragonite": {
                "types": ["Dragon", "Flying"],
                "HP": 91,
                "Attack": 134,
                "Defense": 95,
                "Special": 100,
                "Speed": 80
            },
            "Dratini": {
                "types": ["Dragon"],
                "HP": 41,
                "Attack": 64,
                "Defense": 45,
                "Special": 50,
                "Speed": 50
            },
            "Drowzee": {
                "types": ["Psychic"],
                "HP": 60,
                "Attack": 48,
                "Defense": 45,
                "Special": 90,
                "Speed": 42
            },
            "Dugtrio": {
                "types": ["Ground"],
                "HP": 35,
                "Attack": 80,
                "Defense": 50,
                "Special": 70,
                "Speed": 120
            },
            "Eevee": {
                "types": ["Normal"],
                "HP": 55,
                "Attack": 55,
                "Defense": 50,
                "Special": 65,
                "Speed": 55
            },
            "Ekans": {
                "types": ["Poison"],
                "HP": 35,
                "Attack": 60,
                "Defense": 44,
                "Special": 40,
                "Speed": 55
            },
            "Electabuzz": {
                "types": ["Electric"],
                "HP": 65,
                "Attack": 83,
                "Defense": 57,
                "Special": 85,
                "Speed": 105
            },
            "Electrode": {
                "types": ["Electric"],
                "HP": 60,
                "Attack": 50,
                "Defense": 70,
                "Special": 80,
                "Speed": 140
            },
            "Exeggcute": {
                "types": ["Grass", "Psychic"],
                "HP": 60,
                "Attack": 40,
                "Defense": 80,
                "Special": 60,
                "Speed": 40
            },
            "Exeggutor": {
                "types": ["Grass", "Psychic"],
                "HP": 95,
                "Attack": 95,
                "Defense": 85,
                "Special": 125,
                "Speed": 55
            },
            "Farfetch'd": {
                "types": ["Flying", "Normal"],
                "HP": 52,
                "Attack": 65,
                "Defense": 55,
                "Special": 58,
                "Speed": 60
            },
            "Fearow": {
                "types": ["Flying", "Normal"],
                "HP": 65,
                "Attack": 90,
                "Defense": 65,
                "Special": 61,
                "Speed": 100
            },
            "Flareon": {
                "types": ["Fire"],
                "HP": 65,
                "Attack": 130,
                "Defense": 60,
                "Special": 110,
                "Speed": 65
            },
            "Gastly": {
                "types": ["Ghost", "Poison"],
                "HP": 30,
                "Attack": 35,
                "Defense": 30,
                "Special": 100,
                "Speed": 80
            },
            "Gengar": {
                "types": ["Ghost", "Poison"],
                "HP": 60,
                "Attack": 65,
                "Defense": 60,
                "Special": 130,
                "Speed": 110
            },
            "Geodude": {
                "types": ["Ground", "Rock"],
                "HP": 40,
                "Attack": 80,
                "Defense": 100,
                "Special": 30,
                "Speed": 20
            },
            "Gloom": {
                "types": ["Grass", "Poison"],
                "HP": 60,
                "Attack": 65,
                "Defense": 70,
                "Special": 85,
                "Speed": 40
            },
            "Golbat": {
                "types": ["Flying", "Poison"],
                "HP": 75,
                "Attack": 80,
                "Defense": 70,
                "Special": 75,
                "Speed": 90
            },
            "Goldeen": {
                "types": ["Water"],
                "HP": 45,
                "Attack": 67,
                "Defense": 60,
                "Special": 50,
                "Speed": 63
            },
            "Golduck": {
                "types": ["Water"],
                "HP": 80,
                "Attack": 82,
                "Defense": 78,
                "Special": 80,
                "Speed": 85
            },
            "Golem": {
                "types": ["Ground", "Rock"],
                "HP": 80,
                "Attack": 110,
                "Defense": 130,
                "Special": 55,
                "Speed": 45
            },
            "Graveler": {
                "types": ["Ground", "Rock"],
                "HP": 55,
                "Attack": 95,
                "Defense": 115,
                "Special": 45,
                "Speed": 35
            },
            "Grimer": {
                "types": ["Poison"],
                "HP": 80,
                "Attack": 80,
                "Defense": 50,
                "Special": 40,
                "Speed": 25
            },
            "Growlithe": {
                "types": ["Fire"],
                "HP": 55,
                "Attack": 70,
                "Defense": 45,
                "Special": 50,
                "Speed": 60
            },
            "Gyarados": {
                "types": ["Flying", "Water"],
                "HP": 95,
                "Attack": 125,
                "Defense": 79,
                "Special": 100,
                "Speed": 81
            },
            "Haunter": {
                "types": ["Ghost", "Poison"],
                "HP": 45,
                "Attack": 50,
                "Defense": 45,
                "Special": 115,
                "Speed": 95
            },
            "Hitmonchan": {
                "types": ["Fighting"],
                "HP": 50,
                "Attack": 105,
                "Defense": 79,
                "Special": 35,
                "Speed": 76
            },
            "Hitmonlee": {
                "types": ["Fighting"],
                "HP": 50,
                "Attack": 120,
                "Defense": 53,
                "Special": 35,
                "Speed": 87
            },
            "Horsea": {
                "types": ["Water"],
                "HP": 30,
                "Attack": 40,
                "Defense": 70,
                "Special": 70,
                "Speed": 60
            },
            "Hypno": {
                "types": ["Psychic"],
                "HP": 85,
                "Attack": 73,
                "Defense": 70,
                "Special": 115,
                "Speed": 67
            },
            "Ivysaur": {
                "types": ["Grass", "Poison"],
                "HP": 60,
                "Attack": 62,
                "Defense": 63,
                "Special": 80,
                "Speed": 60
            },
            "Jigglypuff": {
                "types": ["Normal"],
                "HP": 115,
                "Attack": 45,
                "Defense": 20,
                "Special": 25,
                "Speed": 20
            },
            "Jolteon": {
                "types": ["Electric"],
                "HP": 65,
                "Attack": 65,
                "Defense": 60,
                "Special": 110,
                "Speed": 130
            },
            "Jynx": {
                "types": ["Ice", "Psychic"],
                "HP": 65,
                "Attack": 50,
                "Defense": 35,
                "Special": 95,
                "Speed": 95
            },
            "Kabuto": {
                "types": ["Rock", "Water"],
                "HP": 30,
                "Attack": 80,
                "Defense": 90,
                "Special": 45,
                "Speed": 55
            },
            "Kabutops": {
                "types": ["Rock", "Water"],
                "HP": 60,
                "Attack": 115,
                "Defense": 105,
                "Special": 70,
                "Speed": 80
            },
            "Kadabra": {
                "types": ["Psychic"],
                "HP": 40,
                "Attack": 35,
                "Defense": 30,
                "Special": 120,
                "Speed": 105
            },
            "Kakuna": {
                "types": ["Bug", "Poison"],
                "HP": 45,
                "Attack": 25,
                "Defense": 50,
                "Special": 25,
                "Speed": 35
            },
            "Kangaskhan": {
                "types": ["Normal"],
                "HP": 105,
                "Attack": 95,
                "Defense": 80,
                "Special": 40,
                "Speed": 90
            },
            "Kingler": {
                "types": ["Water"],
                "HP": 55,
                "Attack": 130,
                "Defense": 115,
                "Special": 50,
                "Speed": 75
            },
            "Koffing": {
                "types": ["Poison"],
                "HP": 40,
                "Attack": 65,
                "Defense": 95,
                "Special": 60,
                "Speed": 35
            },
            "Krabby": {
                "types": ["Water"],
                "HP": 30,
                "Attack": 105,
                "Defense": 90,
                "Special": 25,
                "Speed": 50
            },
            "Lapras": {
                "types": ["Ice", "Water"],
                "HP": 130,
                "Attack": 85,
                "Defense": 80,
                "Special": 95,
                "Speed": 60
            },
            "Lickitung": {
                "types": ["Normal"],
                "HP": 90,
                "Attack": 55,
                "Defense": 75,
                "Special": 60,
                "Speed": 30
            },
            "Machamp": {
                "types": ["Fighting"],
                "HP": 90,
                "Attack": 130,
                "Defense": 80,
                "Special": 65,
                "Speed": 55
            },
            "Machoke": {
                "types": ["Fighting"],
                "HP": 80,
                "Attack": 100,
                "Defense": 70,
                "Special": 50,
                "Speed": 45
            },
            "Machop": {
                "types": ["Fighting"],
                "HP": 70,
                "Attack": 80,
                "Defense": 50,
                "Special": 35,
                "Speed": 35
            },
            "Magikarp": {
                "types": ["Water"],
                "HP": 20,
                "Attack": 10,
                "Defense": 55,
                "Special": 20,
                "Speed": 80
            },
            "Magmar": {
                "types": ["Fire"],
                "HP": 65,
                "Attack": 95,
                "Defense": 57,
                "Special": 85,
                "Speed": 93
            },
            "Magnemite": {
                "types": ["Electric"],
                "HP": 25,
                "Attack": 35,
                "Defense": 70,
                "Special": 95,
                "Speed": 45
            },
            "Magneton": {
                "types": ["Electric"],
                "HP": 50,
                "Attack": 60,
                "Defense": 95,
                "Special": 120,
                "Speed": 70
            },
            "Mankey": {
                "types": ["Fighting"],
                "HP": 40,
                "Attack": 80,
                "Defense": 35,
                "Special": 35,
                "Speed": 70
            },
            "Marowak": {
                "types": ["Ground"],
                "HP": 60,
                "Attack": 80,
                "Defense": 110,
                "Special": 50,
                "Speed": 45
            },
            "Meowth": {
                "types": ["Normal"],
                "HP": 40,
                "Attack": 45,
                "Defense": 35,
                "Special": 40,
                "Speed": 90
            },
            "Metapod": {
                "types": ["Bug"],
                "HP": 50,
                "Attack": 20,
                "Defense": 55,
                "Special": 25,
                "Speed": 30
            },
            "Mew": {
                "types": ["Psychic"],
                "HP": 100,
                "Attack": 100,
                "Defense": 100,
                "Special": 100,
                "Speed": 100
            },
            "Mewtwo": {
                "types": ["Psychic"],
                "HP": 106,
                "Attack": 110,
                "Defense": 90,
                "Special": 154,
                "Speed": 130
            },
            "Moltres": {
                "types": ["Fire", "Flying"],
                "HP": 90,
                "Attack": 100,
                "Defense": 90,
                "Special": 125,
                "Speed": 90
            },
            "Mr. Mime": {
                "types": ["Psychic"],
                "HP": 40,
                "Attack": 45,
                "Defense": 65,
                "Special": 100,
                "Speed": 90
            },
            "Muk": {
                "types": ["Poison"],
                "HP": 105,
                "Attack": 105,
                "Defense": 75,
                "Special": 65,
                "Speed": 50
            },
            "Nidoking": {
                "types": ["Ground", "Poison"],
                "HP": 81,
                "Attack": 92,
                "Defense": 77,
                "Special": 75,
                "Speed": 85
            },
            "Nidoqueen": {
                "types": ["Ground", "Poison"],
                "HP": 90,
                "Attack": 82,
                "Defense": 87,
                "Special": 75,
                "Speed": 76
            },
            "Nidoran-F": {
                "types": ["Poison"],
                "HP": 55,
                "Attack": 47,
                "Defense": 52,
                "Special": 40,
                "Speed": 41
            },
            "Nidoran-M": {
                "types": ["Poison"],
                "HP": 46,
                "Attack": 57,
                "Defense": 40,
                "Special": 40,
                "Speed": 50
            },
            "Nidorina": {
                "types": ["Poison"],
                "HP": 70,
                "Attack": 62,
                "Defense": 67,
                "Special": 55,
                "Speed": 56
            },
            "Nidorino": {
                "types": ["Poison"],
                "HP": 61,
                "Attack": 72,
                "Defense": 57,
                "Special": 55,
                "Speed": 65
            },
            "Ninetales": {
                "types": ["Fire"],
                "HP": 73,
                "Attack": 76,
                "Defense": 75,
                "Special": 100,
                "Speed": 100
            },
            "Oddish": {
                "types": ["Grass", "Poison"],
                "HP": 45,
                "Attack": 50,
                "Defense": 55,
                "Special": 75,
                "Speed": 30
            },
            "Omanyte": {
                "types": ["Rock", "Water"],
                "HP": 35,
                "Attack": 40,
                "Defense": 100,
                "Special": 90,
                "Speed": 35
            },
            "Omastar": {
                "types": ["Rock", "Water"],
                "HP": 70,
                "Attack": 60,
                "Defense": 125,
                "Special": 115,
                "Speed": 55
            },
            "Onix": {
                "types": ["Ground", "Rock"],
                "HP": 35,
                "Attack": 45,
                "Defense": 160,
                "Special": 30,
                "Speed": 70
            },
            "Paras": {
                "types": ["Bug", "Grass"],
                "HP": 35,
                "Attack": 70,
                "Defense": 55,
                "Special": 55,
                "Speed": 25
            },
            "Parasect": {
                "types": ["Bug", "Grass"],
                "HP": 60,
                "Attack": 95,
                "Defense": 80,
                "Special": 80,
                "Speed": 30
            },
            "Persian": {
                "types": ["Normal"],
                "HP": 65,
                "Attack": 70,
                "Defense": 60,
                "Special": 65,
                "Speed": 115
            },
            "Pidgeot": {
                "types": ["Flying", "Normal"],
                "HP": 83,
                "Attack": 80,
                "Defense": 75,
                "Special": 70,
                "Speed": 91
            },
            "Pidgeotto": {
                "types": ["Flying", "Normal"],
                "HP": 63,
                "Attack": 60,
                "Defense": 55,
                "Special": 50,
                "Speed": 71
            },
            "Pidgey": {
                "types": ["Flying", "Normal"],
                "HP": 40,
                "Attack": 45,
                "Defense": 40,
                "Special": 35,
                "Speed": 56
            },
            "Pikachu": {
                "types": ["Electric"],
                "HP": 35,
                "Attack": 55,
                "Defense": 30,
                "Special": 50,
                "Speed": 90
            },
            "Pinsir": {
                "types": ["Bug"],
                "HP": 65,
                "Attack": 125,
                "Defense": 100,
                "Special": 55,
                "Speed": 85
            },
            "Poliwag": {
                "types": ["Water"],
                "HP": 40,
                "Attack": 50,
                "Defense": 40,
                "Special": 40,
                "Speed": 90
            },
            "Poliwhirl": {
                "types": ["Water"],
                "HP": 65,
                "Attack": 65,
                "Defense": 65,
                "Special": 50,
                "Speed": 90
            },
            "Poliwrath": {
                "types": ["Fighting", "Water"],
                "HP": 90,
                "Attack": 85,
                "Defense": 95,
                "Special": 70,
                "Speed": 70
            },
            "Ponyta": {
                "types": ["Fire"],
                "HP": 50,
                "Attack": 85,
                "Defense": 55,
                "Special": 65,
                "Speed": 90
            },
            "Porygon": {
                "types": ["Normal"],
                "HP": 65,
                "Attack": 60,
                "Defense": 70,
                "Special": 75,
                "Speed": 40
            },
            "Primeape": {
                "types": ["Fighting"],
                "HP": 65,
                "Attack": 105,
                "Defense": 60,
                "Special": 60,
                "Speed": 95
            },
            "Psyduck": {
                "types": ["Water"],
                "HP": 50,
                "Attack": 52,
                "Defense": 48,
                "Special": 50,
                "Speed": 55
            },
            "Raichu": {
                "types": ["Electric"],
                "HP": 60,
                "Attack": 90,
                "Defense": 55,
                "Special": 90,
                "Speed": 100
            },
            "Rapidash": {
                "types": ["Fire"],
                "HP": 65,
                "Attack": 100,
                "Defense": 70,
                "Special": 80,
                "Speed": 105
            },
            "Raticate": {
                "types": ["Normal"],
                "HP": 55,
                "Attack": 81,
                "Defense": 60,
                "Special": 50,
                "Speed": 97
            },
            "Rattata": {
                "types": ["Normal"],
                "HP": 30,
                "Attack": 56,
                "Defense": 35,
                "Special": 25,
                "Speed": 72
            },
            "Rhydon": {
                "types": ["Ground", "Rock"],
                "HP": 105,
                "Attack": 130,
                "Defense": 120,
                "Special": 45,
                "Speed": 40
            },
            "Rhyhorn": {
                "types": ["Ground", "Rock"],
                "HP": 80,
                "Attack": 85,
                "Defense": 95,
                "Special": 30,
                "Speed": 25
            },
            "Sandshrew": {
                "types": ["Ground"],
                "HP": 50,
                "Attack": 75,
                "Defense": 85,
                "Special": 30,
                "Speed": 40
            },
            "Sandslash": {
                "types": ["Ground"],
                "HP": 75,
                "Attack": 100,
                "Defense": 110,
                "Special": 55,
                "Speed": 65
            },
            "Scyther": {
                "types": ["Bug", "Flying"],
                "HP": 70,
                "Attack": 110,
                "Defense": 80,
                "Special": 55,
                "Speed": 105
            },
            "Seadra": {
                "types": ["Water"],
                "HP": 55,
                "Attack": 65,
                "Defense": 95,
                "Special": 95,
                "Speed": 85
            },
            "Seaking": {
                "types": ["Water"],
                "HP": 80,
                "Attack": 92,
                "Defense": 65,
                "Special": 80,
                "Speed": 68
            },
            "Seel": {
                "types": ["Water"],
                "HP": 65,
                "Attack": 45,
                "Defense": 55,
                "Special": 70,
                "Speed": 45
            },
            "Shellder": {
                "types": ["Water"],
                "HP": 30,
                "Attack": 65,
                "Defense": 100,
                "Special": 45,
                "Speed": 40
            },
            "Slowbro": {
                "types": ["Psychic", "Water"],
                "HP": 95,
                "Attack": 75,
                "Defense": 110,
                "Special": 80,
                "Speed": 30
            },
            "Slowpoke": {
                "types": ["Psychic", "Water"],
                "HP": 90,
                "Attack": 65,
                "Defense": 65,
                "Special": 40,
                "Speed": 15
            },
            "Snorlax": {
                "types": ["Normal"],
                "HP": 160,
                "Attack": 110,
                "Defense": 65,
                "Special": 65,
                "Speed": 30
            },
            "Spearow": {
                "types": ["Flying", "Normal"],
                "HP": 40,
                "Attack": 60,
                "Defense": 30,
                "Special": 31,
                "Speed": 70
            },
            "Squirtle": {
                "label": "TINYTURTLE",
                "info": [
                    "After birth, its back swells and hardens into a",
                    "shell. Powerfully sprays foam out of its mouth."
                ],
                "number": 7,
                "height": ["1", "08"],
                "weight": "20.0",
                "types": ["Water"],
                "HP": 44,
                "Attack": 48,
                "Defense": 65,
                "Special": 50,
                "Speed": 43,
                "moves": {
                    "natural": [
                        {
                            "level": 0,
                            "move": "Tackle"
                        }, {
                            "level": 0,
                            "move": "Tail Whip"
                        }, {
                            "level": 8,
                            "move": "Bubble"
                        }, {
                            "level": 15,
                            "move": "Water Gun"
                        }, {
                            "level": 22,
                            "move": "Bite"
                        }, {
                            "level": 28,
                            "move": "Withdraw"
                        }, {
                            "level": 35,
                            "move": "Skull Bash"
                        }, {
                            "level": 42,
                            "move": "Hydro Pump"
                        }
                    ]
                }
            },
            "Starmie": {
                "types": ["Psychic", "Water"],
                "HP": 60,
                "Attack": 75,
                "Defense": 85,
                "Special": 100,
                "Speed": 115
            },
            "Staryu": {
                "types": ["Water"],
                "HP": 30,
                "Attack": 45,
                "Defense": 55,
                "Special": 70,
                "Speed": 85
            },
            "Tangela": {
                "types": ["Grass"],
                "HP": 65,
                "Attack": 55,
                "Defense": 115,
                "Special": 100,
                "Speed": 60
            },
            "Tauros": {
                "types": ["Normal"],
                "HP": 75,
                "Attack": 100,
                "Defense": 95,
                "Special": 70,
                "Speed": 110
            },
            "Tentacool": {
                "types": ["Poison", "Water"],
                "HP": 40,
                "Attack": 40,
                "Defense": 35,
                "Special": 100,
                "Speed": 70
            },
            "Tentacruel": {
                "types": ["Poison", "Water"],
                "HP": 80,
                "Attack": 70,
                "Defense": 65,
                "Special": 120,
                "Speed": 100
            },
            "Vaporeon": {
                "types": ["Water"],
                "HP": 130,
                "Attack": 65,
                "Defense": 60,
                "Special": 110,
                "Speed": 65
            },
            "Venomoth": {
                "types": ["Bug", "Poison"],
                "HP": 70,
                "Attack": 65,
                "Defense": 60,
                "Special": 90,
                "Speed": 90
            },
            "Venonat": {
                "types": ["Bug", "Poison"],
                "HP": 60,
                "Attack": 55,
                "Defense": 50,
                "Special": 40,
                "Speed": 45
            },
            "Venusaur": {
                "types": ["Grass", "Poison"],
                "HP": 80,
                "Attack": 82,
                "Defense": 83,
                "Special": 100,
                "Speed": 80
            },
            "Victreebel": {
                "types": ["Grass", "Poison"],
                "HP": 80,
                "Attack": 105,
                "Defense": 65,
                "Special": 100,
                "Speed": 70
            },
            "Vileplume": {
                "types": ["Grass", "Poison"],
                "HP": 75,
                "Attack": 80,
                "Defense": 85,
                "Special": 100,
                "Speed": 50
            },
            "Voltorb": {
                "types": ["Electric"],
                "HP": 40,
                "Attack": 30,
                "Defense": 50,
                "Special": 55,
                "Speed": 100
            },
            "Vulpix": {
                "types": ["Fire"],
                "HP": 38,
                "Attack": 41,
                "Defense": 40,
                "Special": 65,
                "Speed": 65
            },
            "Wartortle": {
                "types": ["Water"],
                "HP": 59,
                "Attack": 63,
                "Defense": 80,
                "Special": 65,
                "Speed": 58
            },
            "Weedle": {
                "types": ["Bug", "Poison"],
                "HP": 40,
                "Attack": 35,
                "Defense": 30,
                "Special": 20,
                "Speed": 50
            },
            "Weepinbell": {
                "types": ["Grass", "Poison"],
                "HP": 65,
                "Attack": 90,
                "Defense": 50,
                "Special": 85,
                "Speed": 55
            },
            "Weezing": {
                "types": ["Poison"],
                "HP": 65,
                "Attack": 90,
                "Defense": 120,
                "Special": 85,
                "Speed": 60
            },
            "Wigglytuff": {
                "types": ["Normal"],
                "HP": 140,
                "Attack": 70,
                "Defense": 45,
                "Special": 50,
                "Speed": 45
            },
            "Zapdos": {
                "types": ["Electric", "Flying"],
                "HP": 90,
                "Attack": 90,
                "Defense": 85,
                "Special": 125,
                "Speed": 100
            },
            "Zubat": {
                "types": ["Flying", "Poison"],
                "HP": 40,
                "Attack": 45,
                "Defense": 35,
                "Special": 40,
                "Speed": 55
            }
        },
        /**
         * Run on http://www.smogon.com/dex/rb/moves/
         * 
         * var output = {};
         * 
         * function tryNumber(string) {
         *     return isNaN(Number(string)) ? string : Number(string);
         * }
         * 
         * Array.prototype.slice.call(document.querySelectorAll("tr")).map(function (row) {
         *     output[row.children[0].innerText.trim()] = {
         *         "Type": row.children[1].innerText.trim(),
         *         "Damage": tryNumber(row.children[2].children[0].className.replace("damage-category-block ", "")),
         *         "Power": tryNumber(row.children[3].innerText.split(/\s+/g)[1]),
         *         "Accuracy": tryNumber(row.children[4].innerText.split(/\s+/g)[1]),
         *         "PP": tryNumber(row.children[5].innerText.split(/\s+/g)[1]),
         *         "Description": row.children[6].innerText
         *     };
         * });
         * 
         * JSON.stringify(output);
         */
        "moves": {
            "Absorb": {
                "Type": "Grass",
                "Damage": "Special",
                "Power": 20,
                "Accuracy": "100%",
                "PP": 20,
                "Description": "Leeches 50% of the damage dealt."
            },
            "Acid": {
                "Type": "Poison",
                "Damage": "Physical",
                "Power": 40,
                "Accuracy": "100%",
                "PP": 30,
                "Description": "10% chance to lower the target's Defense by one stage."
            },
            "Acid Armor": {
                "Type": "Poison",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "�",
                "PP": 40,
                "Description": "Boosts the user's Defense by two stages."
            },
            "Agility": {
                "Type": "Psychic",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "�",
                "PP": 30,
                "Description": "Boosts the user's Speed by two stages. Negates the Speed drop of paralysis."
            },
            "Amnesia": {
                "Type": "Psychic",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "�",
                "PP": 20,
                "Description": "Boosts the user's Special by two stages."
            },
            "Aurora Beam": {
                "Type": "Ice",
                "Damage": "Special",
                "Power": 65,
                "Accuracy": "100%",
                "PP": 20,
                "Description": "10% chance to lower the user's Attack by one stage."
            },
            "Barrage": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 15,
                "Accuracy": "85%",
                "PP": 20,
                "Description": "Hits two to five times."
            },
            "Barrier": {
                "Type": "Psychic",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "�",
                "PP": 30,
                "Description": "Boosts the user's Defense by two stages."
            },
            "Bide": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": "�",
                "Accuracy": "�",
                "PP": 10,
                "Description": "Charges for two to three turns; returns double the damage received in those turns."
            },
            "Bind": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 15,
                "Accuracy": "75%",
                "PP": 20,
                "Description": "Prevents the opponent from attacking and deals damage to it at the end of every turn for two to five turns."
            },
            "Bite": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 60,
                "Accuracy": "100%",
                "PP": 25,
                "Description": "10% chance of causing the target to flinch."
            },
            "Blizzard": {
                "Type": "Ice",
                "Damage": "Special",
                "Power": 120,
                "Accuracy": "90%",
                "PP": 5,
                "Description": "10% chance to freeze the target."
            },
            "Body Slam": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 85,
                "Accuracy": "100%",
                "PP": 15,
                "Description": "30% chance to paralyze the target."
            },
            "Bone Club": {
                "Type": "Ground",
                "Damage": "Physical",
                "Power": 65,
                "Accuracy": "85%",
                "PP": 20,
                "Description": "10% chance of causing the target to flinch."
            },
            "Bonemerang": {
                "Type": "Ground",
                "Damage": "Physical",
                "Power": 50,
                "Accuracy": "90%",
                "PP": 10,
                "Description": "Hits twice."
            },
            "Bubble": {
                "Type": "Water",
                "Damage": "Special",
                "Power": 20,
                "Accuracy": "100%",
                "PP": 30,
                "Description": "10% chance to lower the target's Speed by one stage."
            },
            "Bubble Beam": {
                "Type": "Water",
                "Damage": "Special",
                "Power": 65,
                "Accuracy": "100%",
                "PP": 20,
                "Description": "10% chance to lower the target's Speed by one stage."
            },
            "Clamp": {
                "Type": "Water",
                "Damage": "Special",
                "Power": 35,
                "Accuracy": "75%",
                "PP": 10,
                "Description": "Prevents the opponent from attacking and deals damage to it at the end of every turn for two to five turns."
            },
            "Comet Punch": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 18,
                "Accuracy": "85%",
                "PP": 15,
                "Description": "Hits two to five times."
            },
            "Confuse Ray": {
                "Type": "Ghost",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "100%",
                "PP": 10,
                "Description": "Confuses the target."
            },
            "Confusion": {
                "Type": "Psychic",
                "Damage": "Special",
                "Power": 50,
                "Accuracy": "100%",
                "PP": 25,
                "Description": "10% chance to confuse the target."
            },
            "Constrict": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 10,
                "Accuracy": "100%",
                "PP": 35,
                "Description": "10% chance to lower the target Speed by one stage."
            },
            "Conversion": {
                "Type": "Normal",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "�",
                "PP": 30,
                "Description": "Changes the user into the opponent's type."
            },
            "Counter": {
                "Type": "Fighting",
                "Damage": "Physical",
                "Power": "�",
                "Accuracy": "100%",
                "PP": 20,
                "Description": "If hit by a Normal- or Fighting-type attack, deals double the damage taken."
            },
            "Crabhammer": {
                "Type": "Water",
                "Damage": "Special",
                "Power": 90,
                "Accuracy": "85%",
                "PP": 10,
                "Description": "High critical hit rate."
            },
            "Cut": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 50,
                "Accuracy": "95%",
                "PP": 30,
                "Description": "No additional effect."
            },
            "Defense Curl": {
                "Type": "Normal",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "�",
                "PP": 40,
                "Description": "Boosts the user's Defense by one stage."
            },
            "Dig": {
                "Type": "Ground",
                "Damage": "Physical",
                "Power": 100,
                "Accuracy": "100%",
                "PP": 10,
                "Description": "User is made invulnerable for one turn, then hits the next turn."
            },
            "Disable": {
                "Type": "Normal",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "55%",
                "PP": 20,
                "Description": "Randomly disables a foe's move for 0-6 turns."
            },
            "Dizzy Punch": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 70,
                "Accuracy": "100%",
                "PP": 10,
                "Description": "No additional effect."
            },
            "Double Kick": {
                "Type": "Fighting",
                "Damage": "Physical",
                "Power": 30,
                "Accuracy": "100%",
                "PP": 30,
                "Description": "Hits twice."
            },
            "Double Slap": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 15,
                "Accuracy": "85%",
                "PP": 10,
                "Description": "Hits two to five times."
            },
            "Double Team": {
                "Type": "Normal",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "�",
                "PP": 15,
                "Description": "Boosts the user's evasion by one stage."
            },
            "Double-Edge": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 100,
                "Accuracy": "100%",
                "PP": 15,
                "Description": "Has 1/4 recoil."
            },
            "Dragon Rage": {
                "Type": "Dragon",
                "Damage": "Special",
                "Power": "�",
                "Accuracy": "100%",
                "PP": 10,
                "Description": "Always does 40 HP damage."
            },
            "Dream Eater": {
                "Type": "Psychic",
                "Damage": "Special",
                "Power": 100,
                "Accuracy": "100%",
                "PP": 15,
                "Description": "Leeches 50% of the damage dealt. Only works if the target is asleep."
            },
            "Drill Peck": {
                "Type": "Flying",
                "Damage": "Physical",
                "Power": 80,
                "Accuracy": "100%",
                "PP": 20,
                "Description": "No additional effect."
            },
            "Earthquake": {
                "Type": "Ground",
                "Damage": "Physical",
                "Power": 100,
                "Accuracy": "100%",
                "PP": 10,
                "Description": "No additional effect."
            },
            "Egg Bomb": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 100,
                "Accuracy": "75%",
                "PP": 10,
                "Description": "No additional effect."
            },
            "Ember": {
                "Type": "Fire",
                "Damage": "Special",
                "Power": 40,
                "Accuracy": "100%",
                "PP": 25,
                "Description": "10% chance to burn the target."
            },
            "Explosion": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 170,
                "Accuracy": "100%",
                "PP": 5,
                "Description": "Faints the user."
            },
            "Fire Blast": {
                "Type": "Fire",
                "Damage": "Special",
                "Power": 120,
                "Accuracy": "85%",
                "PP": 5,
                "Description": "30% chance to burn the target."
            },
            "Fire Punch": {
                "Type": "Fire",
                "Damage": "Special",
                "Power": 75,
                "Accuracy": "100%",
                "PP": 15,
                "Description": "10% chance to burn the target."
            },
            "Fire Spin": {
                "Type": "Fire",
                "Damage": "Special",
                "Power": 15,
                "Accuracy": "70%",
                "PP": 15,
                "Description": "Prevents the opponent from attacking and deals damage to it at the end of every turn for two to five turns."
            },
            "Fissure": {
                "Type": "Ground",
                "Damage": "Physical",
                "Power": "�",
                "Accuracy": "30%",
                "PP": 5,
                "Description": "OHKOes the target."
            },
            "Flamethrower": {
                "Type": "Fire",
                "Damage": "Special",
                "Power": 95,
                "Accuracy": "100%",
                "PP": 15,
                "Description": "10% chance to burn the target."
            },
            "Flash": {
                "Type": "Normal",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "70%",
                "PP": 20,
                "Description": "Lowers the target's accuracy by one stage."
            },
            "Fly": {
                "Type": "Flying",
                "Damage": "Physical",
                "Power": 70,
                "Accuracy": "95%",
                "PP": 15,
                "Description": "User is made invulnerable for one turn, then hits the next turn."
            },
            "Focus Energy": {
                "Type": "Normal",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "�",
                "PP": 30,
                "Description": "Reduces the user's critical hit rate."
            },
            "Fury Attack": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 15,
                "Accuracy": "85%",
                "PP": 20,
                "Description": "Hits two to five times."
            },
            "Fury Swipes": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 18,
                "Accuracy": "80%",
                "PP": 15,
                "Description": "Hits two to five times."
            },
            "Glare": {
                "Type": "Normal",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "75%",
                "PP": 30,
                "Description": "Paralyzes the target."
            },
            "Growl": {
                "Type": "Normal",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "100%",
                "PP": 40,
                "Description": "Lowers the target's Attack by one stage."
            },
            "Growth": {
                "Type": "Normal",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "�",
                "PP": 40,
                "Description": "Boosts Special one stage."
            },
            "Guillotine": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": "�",
                "Accuracy": "30%",
                "PP": 5,
                "Description": "OHKOes the target."
            },
            "Gust": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 40,
                "Accuracy": "100%",
                "PP": 35,
                "Description": "No additional effect."
            },
            "Harden": {
                "Type": "Normal",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "�",
                "PP": 30,
                "Description": "Boosts the user's Defense by one stage."
            },
            "Haze": {
                "Type": "Ice",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "�",
                "PP": 30,
                "Description": "Eliminates all stat changes."
            },
            "Headbutt": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 70,
                "Accuracy": "100%",
                "PP": 15,
                "Description": "30% chance of causing the target to flinch."
            },
            "High Jump Kick": {
                "Type": "Fighting",
                "Damage": "Physical",
                "Power": 85,
                "Accuracy": "90%",
                "PP": 20,
                "Description": "User takes 1 HP recoil if attack misses or fails."
            },
            "Horn Attack": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 65,
                "Accuracy": "100%",
                "PP": 25,
                "Description": "No additional effect."
            },
            "Horn Drill": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": "�",
                "Accuracy": "30%",
                "PP": 5,
                "Description": "OHKOes the target."
            },
            "Hydro Pump": {
                "Type": "Water",
                "Damage": "Special",
                "Power": 120,
                "Accuracy": "80%",
                "PP": 5,
                "Description": "No additional effect."
            },
            "Hyper Beam": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 150,
                "Accuracy": "90%",
                "PP": 5,
                "Description": "User cannot move next turn, unless opponent or Substitute was KOed."
            },
            "Hyper Fang": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 80,
                "Accuracy": "90%",
                "PP": 15,
                "Description": "10% chance of causing the target to flinch."
            },
            "Hypnosis": {
                "Type": "Psychic",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "60%",
                "PP": 20,
                "Description": "Puts the foe to sleep."
            },
            "Ice Beam": {
                "Type": "Ice",
                "Damage": "Special",
                "Power": 95,
                "Accuracy": "100%",
                "PP": 10,
                "Description": "10% chance to freeze."
            },
            "Ice Punch": {
                "Type": "Ice",
                "Damage": "Special",
                "Power": 75,
                "Accuracy": "100%",
                "PP": 15,
                "Description": "10% chance to freeze."
            },
            "Jump Kick": {
                "Type": "Fighting",
                "Damage": "Physical",
                "Power": 70,
                "Accuracy": "95%",
                "PP": 25,
                "Description": "User takes 1 HP recoil if attack misses."
            },
            "Karate Chop": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 50,
                "Accuracy": "100%",
                "PP": 25,
                "Description": "High critical hit rate."
            },
            "Kinesis": {
                "Type": "Psychic",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "80%",
                "PP": 15,
                "Description": "Lowers the target's accuracy by one stage."
            },
            "Leech Life": {
                "Type": "Bug",
                "Damage": "Physical",
                "Power": 20,
                "Accuracy": "100%",
                "PP": 15,
                "Description": "Leeches 50% of the damage dealt."
            },
            "Leech Seed": {
                "Type": "Grass",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "90%",
                "PP": 10,
                "Description": "Leeches 1/16 of the target's HP each turn."
            },
            "Leer": {
                "Type": "Normal",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "100%",
                "PP": 30,
                "Description": "Lowers the target's Defense by one stage."
            },
            "Lick": {
                "Type": "Ghost",
                "Damage": "Physical",
                "Power": 20,
                "Accuracy": "100%",
                "PP": 30,
                "Description": "30% chance to paralyze the target."
            },
            "Light Screen": {
                "Type": "Psychic",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "�",
                "PP": 30,
                "Description": "Halves Special damage done to user."
            },
            "Lovely Kiss": {
                "Type": "Normal",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "75%",
                "PP": 10,
                "Description": "Puts the target to sleep."
            },
            "Low Kick": {
                "Type": "Fighting",
                "Damage": "Physical",
                "Power": 50,
                "Accuracy": "90%",
                "PP": 20,
                "Description": "30% chance of causing the target to flinch foe."
            },
            "Meditate": {
                "Type": "Psychic",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "�",
                "PP": 40,
                "Description": "Boosts the user's Attack by one stage."
            },
            "Mega Drain": {
                "Type": "Grass",
                "Damage": "Special",
                "Power": 40,
                "Accuracy": "100%",
                "PP": 10,
                "Description": "Leeches 50% of the damage dealt."
            },
            "Mega Kick": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 120,
                "Accuracy": "75%",
                "PP": 5,
                "Description": "No additional effect."
            },
            "Mega Punch": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 80,
                "Accuracy": "85%",
                "PP": 20,
                "Description": "No additional effect."
            },
            "Metronome": {
                "Type": "Normal",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "�",
                "PP": 10,
                "Description": "Uses a random move."
            },
            "Mimic": {
                "Type": "Normal",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "�",
                "PP": 10,
                "Description": "Copies a random move the foe knows."
            },
            "Minimize": {
                "Type": "Normal",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "�",
                "PP": 20,
                "Description": "Boosts the user's evasion by one stage."
            },
            "Mirror Move": {
                "Type": "Flying",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "�",
                "PP": 20,
                "Description": "Use the move the foe just used."
            },
            "Mist": {
                "Type": "Ice",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "�",
                "PP": 30,
                "Description": "Prevents moves that only lower stats from working for 5 turns."
            },
            "Night Shade": {
                "Type": "Ghost",
                "Damage": "Physical",
                "Power": "�",
                "Accuracy": "100%",
                "PP": 15,
                "Description": "Deals damage equal to the user's level."
            },
            "Pay Day": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 40,
                "Accuracy": "100%",
                "PP": 20,
                "Description": "No competitive effect."
            },
            "Peck": {
                "Type": "Flying",
                "Damage": "Physical",
                "Power": 35,
                "Accuracy": "100%",
                "PP": 35,
                "Description": "No additional effect."
            },
            "Petal Dance": {
                "Type": "Grass",
                "Damage": "Special",
                "Power": 70,
                "Accuracy": "100%",
                "PP": 20,
                "Description": "Repeats for two to three turns. Confuses the user at the end."
            },
            "Pin Missile": {
                "Type": "Bug",
                "Damage": "Physical",
                "Power": 14,
                "Accuracy": "85%",
                "PP": 20,
                "Description": "Hits two to five times."
            },
            "Poison Gas": {
                "Type": "Poison",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "55%",
                "PP": 40,
                "Description": "Poisons the target."
            },
            "Poison Powder": {
                "Type": "Poison",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "75%",
                "PP": 35,
                "Description": "Poisons the target."
            },
            "Poison Sting": {
                "Type": "Poison",
                "Damage": "Physical",
                "Power": 15,
                "Accuracy": "100%",
                "PP": 35,
                "Description": "20% chance to poison the target."
            },
            "Pound": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 40,
                "Accuracy": "100%",
                "PP": 35,
                "Description": "No additional effect."
            },
            "Psybeam": {
                "Type": "Psychic",
                "Damage": "Special",
                "Power": 65,
                "Accuracy": "100%",
                "PP": 20,
                "Description": "10% chance to confuse the target."
            },
            "Psychic": {
                "Type": "Psychic",
                "Damage": "Special",
                "Power": 90,
                "Accuracy": "100%",
                "PP": 10,
                "Description": "30% chance to lower the target's Special by one stage."
            },
            "Psywave": {
                "Type": "Psychic",
                "Damage": "Special",
                "Power": "�",
                "Accuracy": "80%",
                "PP": 15,
                "Description": "Does random damage equal to .5x-1.5x the user's level."
            },
            "Quick Attack": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 40,
                "Accuracy": "100%",
                "PP": 30,
                "Description": "Priority +1."
            },
            "Rage": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 20,
                "Accuracy": "100%",
                "PP": 20,
                "Description": "Boosts Attack by one stage if hit, but can only use Rage after that."
            },
            "Razor Leaf": {
                "Type": "Grass",
                "Damage": "Special",
                "Power": 55,
                "Accuracy": "95%",
                "PP": 25,
                "Description": "High critical hit rate."
            },
            "Razor Wind": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 80,
                "Accuracy": "75%",
                "PP": 10,
                "Description": "Charges first turn; attacks on the second."
            },
            "Recover": {
                "Type": "Normal",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "�",
                "PP": 20,
                "Description": "Heals 50% of the user's max HP."
            },
            "Reflect": {
                "Type": "Psychic",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "�",
                "PP": 20,
                "Description": "Lowers the physical damage done to user."
            },
            "Rest": {
                "Type": "Psychic",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "�",
                "PP": 10,
                "Description": "The user goes to sleep for two turns, restoring all HP."
            },
            "Roar": {
                "Type": "Normal",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "100%",
                "PP": 20,
                "Description": "Has no effect."
            },
            "Rock Slide": {
                "Type": "Rock",
                "Damage": "Physical",
                "Power": 75,
                "Accuracy": "90%",
                "PP": 10,
                "Description": "No additional effect."
            },
            "Rock Throw": {
                "Type": "Rock",
                "Damage": "Physical",
                "Power": 50,
                "Accuracy": "90%",
                "PP": 15,
                "Description": "No additional effect."
            },
            "Rolling Kick": {
                "Type": "Fighting",
                "Damage": "Physical",
                "Power": 60,
                "Accuracy": "85%",
                "PP": 15,
                "Description": "30% chance of causing the target to flinch."
            },
            "Sand Attack": {
                "Type": "Ground",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "100%",
                "PP": 15,
                "Description": "Lowers the target's accuracy by one stage."
            },
            "Scratch": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 40,
                "Accuracy": "100%",
                "PP": 35,
                "Description": "No additional effect."
            },
            "Screech": {
                "Type": "Normal",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "85%",
                "PP": 40,
                "Description": "Lowers the target's Defense by two stages."
            },
            "Seismic Toss": {
                "Type": "Fighting",
                "Damage": "Physical",
                "Power": "�",
                "Accuracy": "100%",
                "PP": 20,
                "Description": "Deals damage equal to the user's level."
            },
            "Self-Destruct": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 130,
                "Accuracy": "100%",
                "PP": 5,
                "Description": "Faints the user."
            },
            "Sharpen": {
                "Type": "Normal",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "�",
                "PP": 30,
                "Description": "Boosts the user's Attack by one stage."
            },
            "Sing": {
                "Type": "Normal",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "55%",
                "PP": 15,
                "Description": "Puts the target to sleep."
            },
            "Skull Bash": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 100,
                "Accuracy": "100%",
                "PP": 15,
                "Description": "Charges turn one; attacks turn two."
            },
            "Sky Attack": {
                "Type": "Flying",
                "Damage": "Physical",
                "Power": 140,
                "Accuracy": "90%",
                "PP": 5,
                "Description": "Hits the turn after being used."
            },
            "Slam": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 80,
                "Accuracy": "75%",
                "PP": 20,
                "Description": "No additional effect."
            },
            "Slash": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 70,
                "Accuracy": "100%",
                "PP": 20,
                "Description": "High critical hit rate."
            },
            "Sleep Powder": {
                "Type": "Grass",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "75%",
                "PP": 15,
                "Description": "Puts the target to sleep."
            },
            "Sludge": {
                "Type": "Poison",
                "Damage": "Physical",
                "Power": 65,
                "Accuracy": "100%",
                "PP": 20,
                "Description": "29.7% chance to poison the target."
            },
            "Smog": {
                "Type": "Poison",
                "Damage": "Physical",
                "Power": 20,
                "Accuracy": "70%",
                "PP": 20,
                "Description": "40% chance to poison the target."
            },
            "Smokescreen": {
                "Type": "Normal",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "100%",
                "PP": 20,
                "Description": "Lowers the target's accuracy by one stage."
            },
            "Soft-Boiled": {
                "Type": "Normal",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "�",
                "PP": 10,
                "Description": "Heals 50% of the user's max HP."
            },
            "Solar Beam": {
                "Type": "Grass",
                "Damage": "Special",
                "Power": 120,
                "Accuracy": "100%",
                "PP": 10,
                "Description": "Charges turn 1; attacks turn 2."
            },
            "Sonic Boom": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": "�",
                "Accuracy": "90%",
                "PP": 20,
                "Description": "Does 20 damage. Ghosts take regular damage."
            },
            "Spike Cannon": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 20,
                "Accuracy": "100%",
                "PP": 15,
                "Description": "Hits two to five times."
            },
            "Splash": {
                "Type": "Normal",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "�",
                "PP": 40,
                "Description": "No effect whatsoever."
            },
            "Spore": {
                "Type": "Grass",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "100%",
                "PP": 15,
                "Description": "Puts the target to sleep."
            },
            "Stomp": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 65,
                "Accuracy": "100%",
                "PP": 20,
                "Description": "30% chance of causing the target to flinch."
            },
            "Strength": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 80,
                "Accuracy": "100%",
                "PP": 15,
                "Description": "No additional effect."
            },
            "String Shot": {
                "Type": "Bug",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "95%",
                "PP": 40,
                "Description": "Lowers the target's Speed by one stage."
            },
            "Struggle": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 50,
                "Accuracy": "�",
                "PP": 10,
                "Description": "Has 1/2 recoil. Ghost-types take damage."
            },
            "Stun Spore": {
                "Type": "Grass",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "75%",
                "PP": 30,
                "Description": "Paralyzes the target."
            },
            "Submission": {
                "Type": "Fighting",
                "Damage": "Physical",
                "Power": 80,
                "Accuracy": "80%",
                "PP": 25,
                "Description": "Has 1/4 recoil."
            },
            "Substitute": {
                "Type": "Normal",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "�",
                "PP": 10,
                "Description": "Takes 1/4 the user's max HP to create a Substitute that takes damage for the user."
            },
            "Super Fang": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": "�",
                "Accuracy": "90%",
                "PP": 10,
                "Description": "Deals damage equal to half the target's current HP."
            },
            "Supersonic": {
                "Type": "Normal",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "55%",
                "PP": 20,
                "Description": "Confuses the target."
            },
            "Surf": {
                "Type": "Water",
                "Damage": "Special",
                "Power": 95,
                "Accuracy": "100%",
                "PP": 15,
                "Description": "No additional effect."
            },
            "Swift": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 60,
                "Accuracy": "�",
                "PP": 20,
                "Description": "Always hits."
            },
            "Swords Dance": {
                "Type": "Normal",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "�",
                "PP": 30,
                "Description": "Boosts the user's Attack by two stages."
            },
            "Tackle": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 35,
                "Accuracy": "95%",
                "PP": 35,
                "Description": "No additional effect."
            },
            "Tail Whip": {
                "Type": "Normal",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "100%",
                "PP": 30,
                "Description": "Lowers the Defense of all opposing adjacent Pokemon by one stage."
            },
            "Take Down": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 90,
                "Accuracy": "85%",
                "PP": 20,
                "Description": "Has 1/4 recoil."
            },
            "Teleport": {
                "Type": "Psychic",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "�",
                "PP": 20,
                "Description": "No competitive effect."
            },
            "Thrash": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 90,
                "Accuracy": "100%",
                "PP": 20,
                "Description": "Repeats for three to four turns. Confuses the user at the end."
            },
            "Thunder": {
                "Type": "Electric",
                "Damage": "Special",
                "Power": 120,
                "Accuracy": "70%",
                "PP": 10,
                "Description": "10% chance to paralyze the target."
            },
            "Thunder Punch": {
                "Type": "Electric",
                "Damage": "Special",
                "Power": 75,
                "Accuracy": "100%",
                "PP": 15,
                "Description": "10% chance to paralyze the target."
            },
            "Thunder Shock": {
                "Type": "Electric",
                "Damage": "Special",
                "Power": 40,
                "Accuracy": "100%",
                "PP": 30,
                "Description": "10% chance to paralyze the target."
            },
            "Thunder Wave": {
                "Type": "Electric",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "100%",
                "PP": 20,
                "Description": "Paralyzes the target."
            },
            "Thunderbolt": {
                "Type": "Electric",
                "Damage": "Special",
                "Power": 95,
                "Accuracy": "100%",
                "PP": 15,
                "Description": "10% chance to paralyze the target."
            },
            "Toxic": {
                "Type": "Poison",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "85%",
                "PP": 10,
                "Description": "Badly poisons the target."
            },
            "Transform": {
                "Type": "Normal",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "�",
                "PP": 10,
                "Description": "Transforms the user into the target, copying its type, stats, stat changes, moves, and ability."
            },
            "Tri Attack": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 80,
                "Accuracy": "100%",
                "PP": 10,
                "Description": "No additional effect."
            },
            "Twineedle": {
                "Type": "Bug",
                "Damage": "Physical",
                "Power": 25,
                "Accuracy": "100%",
                "PP": 20,
                "Description": "Hits twice. Each hit has a 20% chance to poison the target."
            },
            "Vice Grip": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 55,
                "Accuracy": "100%",
                "PP": 30,
                "Description": "No additional effect."
            },
            "Vine Whip": {
                "Type": "Grass",
                "Damage": "Special",
                "Power": 35,
                "Accuracy": "100%",
                "PP": 10,
                "Description": "No additional effect."
            },
            "Water Gun": {
                "Type": "Water",
                "Damage": "Special",
                "Power": 40,
                "Accuracy": "100%",
                "PP": 25,
                "Description": "No additional effect."
            },
            "Waterfall": {
                "Type": "Water",
                "Damage": "Special",
                "Power": 80,
                "Accuracy": "100%",
                "PP": 15,
                "Description": "No additional effect."
            },
            "Whirlwind": {
                "Type": "Normal",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "100%",
                "PP": 20,
                "Description": "Has no effect."
            },
            "Wing Attack": {
                "Type": "Flying",
                "Damage": "Physical",
                "Power": 35,
                "Accuracy": "100%",
                "PP": 35,
                "Description": "No additional effect."
            },
            "Withdraw": {
                "Type": "Water",
                "Damage": "Non-Damaging",
                "Power": "�",
                "Accuracy": "�",
                "PP": 40,
                "Description": "Boosts the user's Defense by one stage."
            },
            "Wrap": {
                "Type": "Normal",
                "Damage": "Physical",
                "Power": 15,
                "Accuracy": "85%",
                "PP": 20,
                "Description": "Prevents the opponent from attacking and deals damage to it at the end of every turn for two to five turns."
            }
        }
    }
};