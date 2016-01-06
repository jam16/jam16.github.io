// Rubix, an evolutionary approach to solving the Rubik's Cube, by Jason A. Mahr

'use strict';

/* 1. cube representation (there are 3 sections with 5 subsections each) */

// Thistlethwaite groups' allowed moves, see this.move() for move_ids<->moves
var g0_moves = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
var g1_moves = [1, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
var g2_moves = [1, 4, 7, 10, 12, 13, 14, 15, 16, 17];
var g3_a = [1, 4, 7, 10, 13, 16];

// Allowed moves in my expansion of g3; fewer moves helps evolutionary algorithm
var g3_b = [7, 10, 13, 16];
var g3_c = [13, 16];

// g1 is also solved in two phases, as it was in the refereced publication
var movegroups = [g0_moves, g1_moves, g1_moves, g2_moves, g3_a, g3_b, g3_c];

// cubes can advance to next phase with < max_moves allowed moves; g4 = solved.
var max_moves = [7, 5, 13, 15, 9, 7, 1];

// main innovation: shared prepended linked-list histories (see this.copy())
function Cube() {

	this.init = function() {
		// separate for readability. clockwise (site -> L1 L2 L3 L5 L8 L7 L6 L4)
		this.left = new Array(8); this.right = new Array(8);
		this.front = new Array(8); this.back = new Array(8);
		this.up = new Array(8); this.down = new Array(8);
		this.history = null; this.fitness = 0; this.fitness_plus_size = 0;
	}

	this.init();

	/* 1A. moves and move histories */

    this.l = function() {
        // clockwise turns of the 6 faces (clockwise if looking at face)
        var down6 = this.down[6]; var down7 = this.down[7];
        var down0 = this.down[0];
        var left7 = this.left[7]; var left6 = this.left[6];
        this.left[7] = this.left[5]; this.left[6] = this.left[4];
        this.left[5] = this.left[3]; this.left[4] = this.left[2];
        this.left[3] = this.left[1]; this.left[2] = this.left[0];
        this.left[1] = left7; this.left[0] = left6;
        this.down[0] = this.front[0]; this.down[6] = this.front[6];
        this.down[7] = this.front[7]; this.front[0] = this.up[0];
        this.front[6] = this.up[6]; this.front[7] = this.up[7];
        this.up[0] = this.back[4]; this.up[6] = this.back[2];
        this.up[7] = this.back[3]; this.back[2] = down6;
        this.back[3] = down7; this.back[4] = down0;
    }

    this.r = function() {
        var back6 = this.back[6]; var back7 = this.back[7];
        var back0 = this.back[0];
        var right7 = this.right[7]; var right6 = this.right[6];
        this.right[7] = this.right[5]; this.right[6] = this.right[4];
        this.right[5] = this.right[3]; this.right[4] = this.right[2];
        this.right[3] = this.right[1]; this.right[2] = this.right[0];
        this.right[1] = right7; this.right[0] = right6;
        this.back[0] = this.up[4]; this.back[6] = this.up[2];
        this.back[7] = this.up[3]; this.up[2] = this.front[2];
        this.up[3] = this.front[3]; this.up[4] = this.front[4];
        this.front[2] = this.down[2]; this.front[3] = this.down[3];
        this.front[4] = this.down[4]; this.down[2] = back6;
        this.down[3] = back7; this.down[4] = back0;
    }

    this.f = function() {
        var right6 = this.right[6]; var right7 = this.right[7];
        var right0 = this.right[0];
        var front7 = this.front[7]; var front6 = this.front[6];
        this.front[7] = this.front[5]; this.front[6] = this.front[4];
        this.front[5] = this.front[3]; this.front[4] = this.front[2];
        this.front[3] = this.front[1]; this.front[2] = this.front[0];
        this.front[1] = front7; this.front[0] = front6;
        this.right[0] = this.up[6]; this.right[6] = this.up[4];
        this.right[7] = this.up[5]; this.up[4] = this.left[2];
        this.up[5] = this.left[3]; this.up[6] = this.left[4];
        this.left[2] = this.down[0]; this.left[3] = this.down[1];
        this.left[4] = this.down[2]; this.down[0] = right6;
        this.down[1] = right7; this.down[2] = right0;
    }

    this.b = function() {
        var left6 = this.left[6]; var left7 = this.left[7];
        var left0 = this.left[0];
        var back7 = this.back[7]; var back6 = this.back[6];
        this.back[7] = this.back[5]; this.back[6] = this.back[4];
        this.back[5] = this.back[3]; this.back[4] = this.back[2];
        this.back[3] = this.back[1]; this.back[2] = this.back[0];
        this.back[1] = back7; this.back[0] = back6;
        this.left[0] = this.up[2]; this.left[6] = this.up[0];
        this.left[7] = this.up[1]; this.up[0] = this.right[2];
        this.up[1] = this.right[3]; this.up[2] = this.right[4];
        this.right[2] = this.down[4]; this.right[3] = this.down[5];
        this.right[4] = this.down[6]; this.down[4] = left6;
        this.down[5] = left7; this.down[6] = left0;
    }

    this.u = function() {
        var left0 = this.left[0]; var left1 = this.left[1];
        var left2 = this.left[2];
        var up7 = this.up[7]; var up6 = this.up[6];
        this.up[7] = this.up[5]; this.up[6] = this.up[4];
        this.up[5] = this.up[3]; this.up[4] = this.up[2];
        this.up[3] = this.up[1]; this.up[2] = this.up[0];
        this.up[1] = up7; this.up[0] = up6;
        this.left[0] = this.front[0]; this.left[1] = this.front[1];
        this.left[2] = this.front[2]; this.front[0] = this.right[0];
        this.front[1] = this.right[1]; this.front[2] = this.right[2];
        this.right[0] = this.back[0]; this.right[1] = this.back[1];
        this.right[2] = this.back[2]; this.back[0] = left0;
        this.back[1] = left1; this.back[2] = left2;
    }

    this.d = function() {
        var left4 = this.left[4]; var left5 = this.left[5];
        var left6 = this.left[6];
        var down7 = this.down[7]; var down6 = this.down[6];
        this.down[7] = this.down[5]; this.down[6] = this.down[4];
        this.down[5] = this.down[3]; this.down[4] = this.down[2];
        this.down[3] = this.down[1]; this.down[2] = this.down[0];
        this.down[1] = down7; this.down[0] = down6;
        this.left[4] = this.back[4]; this.left[5] = this.back[5];
        this.left[6] = this.back[6]; this.back[4] = this.right[4];
        this.back[5] = this.right[5]; this.back[6] = this.right[6];
        this.right[4] = this.front[4]; this.right[5] = this.front[5];
        this.right[6] = this.front[6]; this.front[4] = left4;
        this.front[5] = left5; this.front[6] = left6;
    }

	this.prepend = function(move_id) {
		// prepend (recent moves first) allows copied cubes to share histories
		this.history = { id: move_id, next: this.history };
	}

    this.move = function(move_id) {
    	// standard moves: id % 3 = 0 => clockwise; 1, double turn; 2, countercw
    	switch(move_id) {
            case 0: this.l(); break;
            case 1: this.l(); this.l(); break;
            case 2: this.l(); this.l(); this.l(); break;
            case 3: this.r(); break;
            case 4: this.r(); this.r(); break;
            case 5: this.r(); this.r(); this.r(); break;
            case 6: this.f(); break;
            case 7: this.f(); this.f(); break;
            case 8: this.f(); this.f(); this.f(); break;
            case 9: this.b(); break;
            case 10: this.b(); this.b(); break;
            case 11: this.b(); this.b(); this.b(); break;
            case 12: this.u(); break;
            case 13: this.u(); this.u(); break;
            case 14: this.u(); this.u(); this.u(); break;
            case 15: this.d(); break;
            case 16: this.d(); this.d(); break;
            default: this.d(); this.d(); this.d();
        }
        this.prepend(move_id);
    }

	this.size = function() {
		// removes pair (side-side) & oreo (side-oppositeside-side) redundancies
		var current = this.history;
		this.prepend(0);
		var previous = this.history;
		var size = 0;
		while (!size) {
			size = 1;
			while (current !== null && current.next !== null) {
				if (current.id / 3 >> 0 == current.next.id / 3 >> 0) {
					size = 0;
					var current_mod = current.id % 3;
					var mod_sum = current_mod + current.next.id % 3;
                    if (mod_sum == 2) {
                        current = current.next.next;
                        previous.next = current;
                    } else {
                        current.id += ((mod_sum + 1) % 4) - current_mod;
                        current.next = current.next.next;
                    }
                } else if (current.id / 6 >> 0 == current.next.id / 6 >> 0
                    && current.next.next !== null
                    && current.id / 3 >> 0 == current.next.next.id / 3 >> 0) {
                    size = 0;
                    var current_mod = current.id % 3;
                    var mod_sum = current_mod + current.next.next.id % 3;
                    if (mod_sum == 2) {
                        current.id = current.next.id;
                        current.next = current.next.next.next;
                    } else {
                        current.id += ((mod_sum + 1) % 4) - current_mod;
                        current.next = { id: current.next.id,
                            next: current.next.next.next };
                    }
                } else {
                    if (size) {
                        size++;
                    }
                    previous = current;
                    current = current.next;
                }
            }
            previous = this.history;
            current = previous.next;
		}
		this.history = this.history.next;
		return this.history === null ? 0 : size;
	}

	this.get_history = function() {
        // all strings use single outer quotes except id_to_str b/c l' r' ... d'
        var ids = new Array(this.size());
        var strs = new Array(ids.length);
        var html = new Array(ids.length + 1);
        var ptr = this.history;
        var id_to_str = ["L", "L2", "L'", "R", "R2", "R'", "F", "F2", "F'",
                         "B", "B2", "B'", "U", "U2", "U'", "D", "D2", "D'"];
        var fst = '<span class="move" onMouseOver="display_move(';
        var snd = ')" onClick="display_move(';
        var trd = ')" onMouseLeave="display_move(0)">';
        var end = '</span>';
        html[0] = fst + 0 + snd + 0 + trd + ids.length + ' '
            + (ids.length == 1 ? 'move' : 'moves') + ' &#10162;' + end;
        for (var i = ids.length; i-- && ptr !== null; ptr = ptr.next) {
            ids[i] = ptr.id;
            strs[i] = id_to_str[ptr.id];
            html[i + 1] = fst + (i + 1) + snd + (i + 1) + trd + strs[i] + end;
        }
        return [ids, strs.join(' '), html.join(' ')];
    }

	/* 1B. "natural edits" - edit entire cube */

	this.reset = function() {
		// not simply this.init() since new arrays are not necessary
		for (var i = 8; i--;) {
			this.left[i] = 1; this.right[i] = 2; this.front[i] = 3;
			this.back[i] = 4; this.up[i] = 5; this.down[i] = 6;
		}
		this.history = null; this.fitness = 0; this.fitness_plus_size = 0;
	}

	this.copy = function(other) {
		// not copying history pop_size times each generation saves lots of time
		for (var i = 8; i--;) {
			this.left[i] = other.left[i]; this.right[i] = other.right[i];
            this.front[i] = other.front[i]; this.back[i] = other.back[i];
            this.up[i] = other.up[i]; this.down[i] = other.down[i];
		}
		this.history = other.history; this.fitness = other.fitness;
		this.fitness_plus_size = other.fitness_plus_size;
	}

	this.randomize = function() {
		// return when, after removing redundancies, 25 <= num moves made <= 40
		var moves_made = [[]];
		while (moves_made[0].length < 25) {
			this.reset();
			for (var i = 40; i--;) {
				this.move(Math.random() * 18 >> 0);
			}
			moves_made = this.get_history();
		}
		this.history = null;
		return moves_made;
	}

	/* 1C. change and get colors */

	this.change_color = function(tile_id, new_color) {
		for (var check_tile_id_valid = 48; check_tile_id_valid--;) {
    		if (check_tile_id_valid == tile_id) {
    			break;
    		}
    	}
    	if (check_tile_id_valid < 0) {
    		return;
    	}
    	for (var check_new_color_valid = 6; check_new_color_valid--;) {
    		if (check_new_color_valid == new_color) {
    			new_color++;
    			break;
    		}
    	}
    	if (check_new_color_valid >= 0) {
    		switch(tile_id / 8 >> 0) {
				case 0: this.left[tile_id % 8] = new_color; break;
	    		case 1: this.right[tile_id % 8] = new_color; break;
	    		case 2: this.front[tile_id % 8] = new_color; break;
	    		case 3: this.back[tile_id % 8] = new_color; break;
	    		case 4: this.up[tile_id % 8] = new_color; break;
	    		default: this.down[tile_id % 8] = new_color;
			}
    	}
	}

    this.get_colors = function(array_of_6_user_selected_color_ids) {
        // only used to load cube; user selects 6 colors in step 1 of Rubix
        var c = [null].concat(array_of_6_user_selected_color_ids);
        return [c[this.up[0]], c[this.up[1]], c[this.up[2]],
                c[this.up[7]], c[5] + ' center', c[this.up[3]],
                c[this.up[6]], c[this.up[5]], c[this.up[4]],
                c[this.left[0]], c[this.left[1]], c[this.left[2]],
                c[this.front[0]], c[this.front[1]], c[this.front[2]],
                c[this.right[0]], c[this.right[1]], c[this.right[2]],
                c[this.back[0]], c[this.back[1]], c[this.back[2]],
                c[this.left[7]], c[1] + ' center', c[this.left[3]],
                c[this.front[7]], c[3] + ' center', c[this.front[3]],
                c[this.right[7]], c[2] + ' center', c[this.right[3]],
                c[this.back[7]], c[4] + ' center', c[this.back[3]],
                c[this.left[6]], c[this.left[5]], c[this.left[4]],
                c[this.front[6]], c[this.front[5]], c[this.front[4]],
                c[this.right[6]], c[this.right[5]], c[this.right[4]],
                c[this.back[6]], c[this.back[5]], c[this.back[4]],
                c[this.down[0]], c[this.down[1]], c[this.down[2]],
                c[this.down[7]], c[6] + ' center', c[this.down[3]],
                c[this.down[6]], c[this.down[5]], c[this.down[4]]];
    }

	/* 1D. fitness functions for evolutionary Thistlethwaite algorithm */

	this.edge_flipped_correctly = function(tile_1, tile_2) {
		return tile_1 != 3 && tile_1 != 4 && tile_2 < 5;
	}

	this.count_misoriented_edges = function() {
		// max 12; disallowing L, L', R, R' just disables flipping edges
        var num = 0;
        var edges = [this.left[3], this.front[7], this.right[7], this.front[3],
                     this.left[7], this.back[3], this.right[3], this.back[7],
                     this.up[7], this.left[1], this.up[3], this.right[1],
                     this.up[5], this.front[1], this.down[7], this.left[5],
                     this.down[3], this.right[5], this.up[1], this.back[1],
                     this.down[1], this.front[5], this.down[5], this.back[5]];
        for (var i = 12; i--;) {
            if (!this.edge_flipped_correctly(edges[i * 2], edges[i * 2 + 1])) {
                num++;
            }
        }
        return num;
	}

	this.g0_fitness = function() {
		// weights not defined w/ globals b/c many weights & each only used once
		return 10 * this.count_misoriented_edges();
	}

	this.count_misplaced_middle_edges = function() {
		// max 12; all 8 up/ down edges must be either in the up or down face
		var num = 0;
		var wrong_indeces_sum = 0;
		var edges = [this.left[3], this.left[7], this.right[7], this.right[3]];
		for (var i = 4; i--;) {
			if (edges[i] > 4) {
				num++;
				if (i < 2) {
					wrong_indeces_sum += i;
				}
			}
		}
		if (num != 2) {
			return num * 3;
		}
		if (wrong_indeces_sum % 2) {
			return 2;
		}
		if (wrong_indeces_sum == 4) {
			wrong_indeces_sum = 6;
		}
		return (this.up[7 - wrong_indeces_sum] < 5 &&
            this.down[wrong_indeces_sum - 1] < 5) ? 1 : 2;
	}

	this.g1_a_fitness = function() {
		return 10 * this.count_misplaced_middle_edges();
	}

	this.count_misoriented_corners = function() {
		// max 8; up/ down tiles of all 8 corners must face up or down
		var num = 0;
		var corners = [this.up[0], this.up[2], this.up[4], this.up[6],
					   this.down[0], this.down[2], this.down[4], this.down[6]];
		for (var i = 8; i--;) {
            if (corners[i] < 5) {
                num++;
            }
        }
        if (num < 2) {
            return num;
        }
        var credit = [this.right[0], this.back[6], this.right[2], this.front[4],
                      this.right[4], this.front[2], this.right[6], this.back[0],
                      this.left[0], this.front[6], this.left[2], this.back[4],
                      this.left[4], this.back[2], this.left[6], this.front[0]];
        for (var i = 8; i--;) {
            if (credit[i * 2] > 4 && credit[i * 2 + 1] > 4) {
                num--;
            }
        }
        return num;
	}

	this.g1_b_fitness = function() {
		return 10 * this.count_misplaced_middle_edges()
			+ 40 * this.count_misoriented_corners();
	}

	this.count_turns_until_uniform_top_corners = function() {
		// max 5; up face all up corners or all down, other 4 on down face
		var num_top_colors_on_top = 0;
        var indof5;
        var indof6;
        var corners = [this.up[0], this.up[2], this.up[4], this.up[6]];
        for (var i = 4; i--;) {
            if (corners[i] == 5) {
                num_top_colors_on_top++;
                indof5 = i;
            } else {
                indof6 = i;
            }
        }
        if (!(num_top_colors_on_top % 4)) {
            return 0;
        }
        if (num_top_colors_on_top == 1) {
        	return this.down[indof5] == 6 || this.down[indof5 + 4] == 6 ? 3 : 4;
        }
        if (num_top_colors_on_top == 3) {
        	return this.down[indof6] == 5 || this.down[indof6 + 4] == 5 ? 3 : 4;
        }
		var top_color_pairs_diagonal = this.up[0] == this.up[4];
        var bottom_color_pairs_diagonal = this.down[0] == this.down[4];
        if (top_color_pairs_diagonal && bottom_color_pairs_diagonal) {
            return this.up[0] == this.down[6] ? 3 : 4;
        }
        if (top_color_pairs_diagonal || bottom_color_pairs_diagonal) {
            return 5;
        }
        return this.up[0] != this.down[6] && this.up[2] != this.down[4] ? 1 : 2;
    }

    this.count_corner_pairs_not_matching_with_good_color = function() {
    	// max 16; assume previous; good=color of center tile or opposite center
    	var count = 0;
    	var count_sides_with_pairs_both_matching = 0;
    	var count_sides_with_pairs_both_not_matching = 0;
    	var cors = [this.left[0], this.left[2], this.left[4], this.left[6],
                    this.right[0], this.right[2], this.right[4], this.right[6],
                    this.front[0], this.front[2], this.front[4], this.front[6],
                    this.back[0], this.back[2], this.back[4], this.back[6]];
        for (var i = 4; i--;) {
        	var count_this_round = 0;
        	if (cors[i * 4] != cors[i * 4 + 1]) {
        		count_this_round++;
        	}
        	if (cors[i * 4 + 2] != cors[i * 4 + 3]) {
        		count_this_round++;
        	}
        	if (!count_this_round) {
        		count_sides_with_pairs_both_matching += 5;
        	} else {
                count += count_this_round * 4;
                if (count_this_round == 2) {
                    count_sides_with_pairs_both_not_matching += 5;
                }
            }
        }
        if (!count) {
        	var count_turns_until_leftright_matching_corners_on_lr_sides = 0;
        	for (var i = 2; i--;) {
        		if (this.left[i * 4] > 2) {
        			count_turns_until_leftright_matching_corners_on_lr_sides++;
        		}
        	}
        	return count_turns_until_leftright_matching_corners_on_lr_sides;
        }
        if (count == 32) {
        	return 3;
        }
        if (count < 16) {
        	return count - count_sides_with_pairs_both_not_matching;
        }
        if (count > 16) {
        	return 32 - count - count_sides_with_pairs_both_matching;
        }
        return 16 - Math.max(count_sides_with_pairs_both_matching,
            count_sides_with_pairs_both_not_matching);
    }

    this.count_turns_until_all_edges_good_color = function() {
    	// max 10; assume both previous g2 functions, same definition of good
    	var count_wrong_circuit = [0, 0];
    	var edges = [this.left[1], this.front[5], this.right[1], this.back[5],
    				 this.left[5], this.front[1], this.right[5], this.back[1]];
    	for (var i = 4; i--;) {
    		if (edges[i * 2] > 2) {
    			count_wrong_circuit[i / 2 >> 0]++;
    		}
    		if (edges[i * 2 + 1] < 3) {
    			count_wrong_circuit[i / 2 >> 0]++;
    		}
    	}
    	var c = (count_wrong_circuit[0] + 1) * (count_wrong_circuit[1] + 1) - 1;
    	if (!(c % 24)) {
    		return c / 4;
    	}
    	if (c < 4) {
    		c += 12;
    	}
    	return c - (2 * (c / 5 >> 0));
    }

    this.g2_fitness = function() {
    	return 16000 * this.count_turns_until_uniform_top_corners()
    		+ 800 * this.count_corner_pairs_not_matching_with_good_color()
    		+ 50 * this.count_turns_until_all_edges_good_color();
    }

    this.count_miscolored_middle_edges_on_front_back_up_down = function() {
    	// max 4; all colors already good ==> checking front checks b; u/ d same
    	var num = 0;
    	var edges = [this.front[3], this.front[7], this.up[3], this.up[7]];
    	for (var i = 4; i--;) {
    		if (edges[i] != 3 + (i / 2 >> 0) * 2) {
    			num++;
    		}
    	}
    	return num;
    }

    this.uniform_top = function(side) {
    	return side[0] == side[1] && side[1] == side[2];
    }

    this.uniform_bottom = function(side) {
    	return side[4] == side[5] && side[5] == side[6];
    }

    this.count_nonuniform_topbottom_rows_on_front_back_up_down = function() {
    	// max 8; rs stands for rows
    	var num = 0;
    	var rs = [this.uniform_top(this.front), this.uniform_bottom(this.front),
                  this.uniform_top(this.back), this.uniform_bottom(this.back),
                  this.uniform_top(this.up), this.uniform_bottom(this.up),
                  this.uniform_top(this.down), this.uniform_bottom(this.down)];
        for (var i = 8; i--;) {
        	if (!rs[i]) {
        		num++;
        	}
        }
        return num;
    }

    this.g3_a_fitness = function() {
    	// can now remove L2 and R2, expanded final phase solves faster
    	return 15 * this.count_miscolored_middle_edges_on_front_back_up_down()
    		+ 75 * this.count_nonuniform_topbottom_rows_on_front_back_up_down();
    }

    this.count_miscolored_up_down_tiles = function() {
    	// max 16
    	var num = 0;
    	for (var i = 8; i--;) {
    		if (this.up[i] != 5) {
    			num++;
    		}
    		if (this.down[i] != 6) {
    			num++;
    		}
    	}
    	return num;
    }

    this.count_miscolored_middle_edges_on_left_right = function() {
    	// max 2
    	var num = 0;
    	if (this.left[3] != 1) {
    		num++;
    	}
    	if (this.left[7] != 1) {
    		num++;
    	}
    	return num;
    }

    this.count_nonuniform_topbottom_rows_on_left_right = function() {
    	// max 4
    	var num = 0;
    	var rs = [this.uniform_top(this.right), this.uniform_bottom(this.right),
    			  this.uniform_top(this.left), this.uniform_bottom(this.left)];
    	for (var i = 4; i--;) {
    		if (!rs[i]) {
    			num++;
    		}
    	}
    	return num;
    }

    this.g3_b_fitness = function() {
    	return 5 * this.count_miscolored_up_down_tiles()
    		+ 15 * this.count_miscolored_middle_edges_on_left_right()
    		+ 15 * this.count_nonuniform_topbottom_rows_on_left_right();
    }

    this.count_miscolored_tiles = function() {
        var num = 0;
        for (var i = 8; i--;) {
            if (this.left[i] != 1) {
                num++;
            }
            if (this.right[i] != 2) {
                num++;
            }
            if (this.front[i] != 3) {
                num++;
            }
            if (this.back[i] != 4) {
                num++;
            }
            if (this.up[i] != 5) {
                num++;
            }
            if (this.down[i] != 6) {
                num++;
            }
        }
        return num;
    }

    this.g3_c_fitness = function() {
    	return 5 * this.count_miscolored_tiles();
    }

    this.mutate = function(phase) {
    	var movegroup_length = movegroups[phase].length;
    	for (var i = Math.random() * (max_moves[phase] + 1) >> 0; i--;) {
    		this.move(movegroups[phase][Math.random() * movegroup_length >> 0]);
    	}
    	switch(phase) {
    		case 0: this.fitness = this.g0_fitness(); break;
            case 1: this.fitness = this.g1_a_fitness(); break;
            case 2: this.fitness = this.g1_b_fitness(); break;
            case 3: this.fitness = this.g2_fitness(); break;
            case 4: this.fitness = this.g3_a_fitness(); break;
            case 5: this.fitness = this.g3_b_fitness(); break;
            default: this.fitness = this.g3_c_fitness();
    	}
    	this.fitness_plus_size = this.fitness + 1.9 * this.size();
    }

	/* 1E. cube validation */

	this.is_solved = function() {
		// hard invariant: sides have 8 elts; uses last fitness score function
		return !this.count_miscolored_tiles();
	}

	this.permutation_is_even = function(p) {
		// is_valid() helper; works for any size-n p of the values 0,1,...,n-1
		var len = p.length;
        var visited = new Array(len);
        for (var i = len; i--;) {
            visited[p[i]] = false;
        }
        if (visited.length != len) {
            return false;
        }
        for (var i = len; i--;) {
            if (visited[i] !== false) {
                return false;
            }
        }
        var is_even = true;
        for (var i = len; i--;) {
            if (!visited[i]) {
                for (var j = p[i]; j !== i; j = p[j]) {
                    is_even = !is_even;
                    visited[j] = true;
                }
            }
        }
        return is_even;
	}

	this.is_valid = function() {
		// checks that a cube is solvable (http://goo.gl/UudH61) but not solved
		if (this.is_solved()) {
			return false;
		}
		var corner_order = [45, 35, 49, 53, 42, 38, 46, 56];
        var corner_pos = [[this.up[2], this.back[0], this.right[2]],
                          [this.up[6], this.front[0], this.left[2]],
                          [this.down[2], this.front[4], this.right[6]],
                          [this.down[6], this.back[4], this.left[6]],
                          [this.up[0], this.back[2], this.left[0]],
                          [this.up[4], this.front[2], this.right[0]],
                          [this.down[0], this.front[6], this.left[4]],
                          [this.down[4], this.back[6], this.right[4]]];
        var corner_permutation = [-1, -1, -1, -1, -1, -1, -1, -1];
        var corner_parity_x = 0;
        var corner_parity_y = 0;
        var corner_parity_z = 0;
        for (var i = 8; i--;) {
            for (var j = 2; j--;) {
                if (corner_pos[i][j] !== 1 && corner_pos[i][j] !== 2
                    && corner_pos[i][j] !== 3 && corner_pos[i][j] !== 4
                    && corner_pos[i][j] !== 5 && corner_pos[i][j] !== 6) {
                    return false;
                }
            }
            if (corner_pos[i][0] == corner_pos[i][1] || corner_pos[i][1]
                == corner_pos[i][2] || corner_pos[i][0] == corner_pos[i][2]) {
                return false;
            }
            var sum_of_squares = corner_pos[i][0] * corner_pos[i][0]
                + corner_pos[i][1] * corner_pos[i][1]
                + corner_pos[i][2] * corner_pos[i][2];
            for (var k = 8; k--;) {
                if (sum_of_squares == corner_order[k]) {
                    if (corner_permutation[k] !== -1) {
                        return false;
                    }
                    corner_permutation[k] = i;
                    var color_andposition_same_orbit = k / 4 >> 0 == i / 4 >> 0;
                    var first_positional_orbit_1_2nd_2 = (i / 4 >> 0) + 1;
                    var first_positional_orbit_2_2nd_1 = 2 - (i / 4 >> 0);
                    if (corner_pos[i][0] > 4) {
                        if (corner_pos[i][1] < 3) {
                            if (color_andposition_same_orbit) {
                                return false;
                            }
                            corner_parity_z += first_positional_orbit_2_2nd_1;
                            corner_parity_y += first_positional_orbit_1_2nd_2;
                        } else if (!color_andposition_same_orbit) {
                            return false;
                        }
                    } else if (corner_pos[i][0] < 3) {
                        corner_parity_z += first_positional_orbit_1_2nd_2;
                        if (corner_pos[i][1] > 4) {
                            if (!color_andposition_same_orbit) {
                                return false;
                            }
                            corner_parity_x += first_positional_orbit_1_2nd_2;
                            corner_parity_y += first_positional_orbit_1_2nd_2;
                        } else {
                            if (color_andposition_same_orbit) {
                                return false;
                            }
                            corner_parity_x += first_positional_orbit_2_2nd_1;
                        }
                    } else {
                        corner_parity_y += first_positional_orbit_2_2nd_1;
                        if (corner_pos[i][1] < 3) {
                            if (!color_andposition_same_orbit) {
                                return false;
                            }
                            corner_parity_z += first_positional_orbit_2_2nd_1;
                            corner_parity_x += first_positional_orbit_2_2nd_1;
                        } else {
                            if (color_andposition_same_orbit) {
                                return false;
                            }
                            corner_parity_x += first_positional_orbit_1_2nd_2;
                        }
                    }
                    sum_of_squares = 0;
                    break;
                }
           	}
           	if (sum_of_squares) {
           		return false;
           	}
        }
        if (corner_parity_x % 3 || corner_parity_y % 3 || corner_parity_z % 3) {
            return false;
        }
        var edge_order = [10, 13, 17, 20, 26, 29, 34, 41, 37, 40, 45, 52];
        var edge_positions =
        	[this.left[3], this.front[7], this.right[7], this.front[3],
             this.left[7], this.back[3], this.right[3], this.back[7],
             this.up[7], this.left[1], this.up[3], this.right[1],
             this.up[5], this.front[1], this.up[1], this.back[1],
             this.down[7], this.left[5], this.down[3], this.right[5],
             this.down[1], this.front[5], this.down[5], this.back[5]];
        var edge_permutation = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1];
        var edge_parity = true;
        for (var i = 12; i--;) {
            if ((edge_positions[2 * i] !== 1 && edge_positions[2 * i] !== 2
                && edge_positions[2 * i] !== 3 && edge_positions[2 * i] !== 4
                && edge_positions[2 * i] !== 5 && edge_positions[2 * i] !== 6)||
                (edge_positions[2*i+1] !== 1 && edge_positions[2*i+1] !== 2
                && edge_positions[2*i+1] !== 3 && edge_positions[2*i+1] !== 4
                && edge_positions[2*i+1] !== 5 && edge_positions[2*i+1] !== 6)||
                edge_positions[2 * i] == edge_positions[2 * i + 1]) {
                return false;
            }
            var sum_of_squares =
                edge_positions[2 * i] * edge_positions[2 * i]
                + edge_positions[2 * i + 1] * edge_positions[2 * i + 1];
            for (var j = 12; j--;) {
                if (sum_of_squares == edge_order[j]) {
                    if (edge_permutation[j] !== -1) {
                        return false;
                    }
                    edge_permutation[j] = i;
                    if (edge_positions[2 * i] == 3 || edge_positions[2 * i] == 4
                        || edge_positions[2 * i + 1] > 4) {
                        edge_parity = !edge_parity;
                    }
                    sum_of_squares = 0;
                    break;
                }
            }
            if (sum_of_squares) {
                return false;
            }
        }
        return edge_parity
        	&& (this.permutation_is_even(corner_permutation)
        		== this.permutation_is_even(edge_permutation));
	}
}

/* 2. evolutionary algorithm */

var pop_size = 31200;
var num_survivors = 1040;
var max_generations_before_reset = 1e6;
var num_selections = 1e5;

/* 2A. initiate or reset population based on input instantiation of Cube() */

function create_population(cube) {
	var population = new Array(pop_size);
	for (var i = population.length; i--;) {
		population[i] = new Cube();
		population[i].copy(cube);
	}
	return population;
}

function reset_population(population, cube) {
	for (var i = population.length; i--;) {
		population[i].copy(cube);
	}
}

/* 2B. select survivors for next generation using geometric probabilities */

var selections = new Array(num_selections);

window.onload = function() {
    // ensures that selections are generated before page loads
    if (pop_size < num_survivors) {
        prevent_use();
        return;
    }
    var ratio = (num_survivors - 1) / num_survivors;
    var prob = (1 / num_survivors) / (1 - Math.pow(ratio, num_survivors));
    var cumulative_probabilities = new Array(num_survivors);
    cumulative_probabilities[0] = prob;
    cumulative_probabilities[num_survivors - 1] = 1;
    for (var i = 1; i < num_survivors - 1; i++) {
        prob *= ratio;
        cumulative_probabilities[i] = cumulative_probabilities[i - 1] + prob;
    }
    for (var i = num_selections; i--;) {
        for (var random_float = Math.random(), j = 0;; j++) {
            if (random_float < cumulative_probabilities[j]) {
                selections[i] = j;
                break;
            }
        }
    }
}

var ind = -1;
function select_survivor() {
    return ++ind >= selections.length ? selections[ind = 0] : selections[ind];
}

/* 2C. next generation */

function next_generation(population, phase) {
    // mutates all cubes in pop then selects next gen based on fitness_plus_size
    for (var i = pop_size; i--;) {
        population[i].mutate(phase);
    }
    population.sort(function(cube_a, cube_b) {
        return cube_a.fitness_plus_size - cube_b.fitness_plus_size;
    });
    var go_to_next_phase = true;
    for (var i = num_survivors; i--;) {
        if (population[i].fitness) {
            go_to_next_phase = false;
        }
    }
    if (!(phase == movegroups.length - 1 && go_to_next_phase)) {
        for (var i = num_survivors; i < pop_size; i++) {
            population[i].copy(population[select_survivor()]);
        }
    }
    return go_to_next_phase;
}

/* 2D. solve */

function solve(cube, array_of_6_user_selected_color_ids) {
    // stopwatch stopped before UI tasks (not part of evolutionary alg)
    var time = new Date().getTime();
    var gen_count = 0;
    var resets = 0;
    var phase = 0;
    var population = create_population(cube);
    while (phase < movegroups.length) {
        if (++gen_count > max_generations_before_reset) {
            reset_population(population, cube);
            gen_count = 0;
            phase = 0;
            resets++;
        } else if (next_generation(population, phase)) {
            phase++;
        }
    }
    time = Math.round((new Date().getTime() - time) / 100) / 10;
    var moves_made = population[0].get_history();
    var cube_states = new Array(moves_made[0].length + 1);
    cube_states[0] = cube.get_colors(array_of_6_user_selected_color_ids);
    for (var i = 1; i < cube_states.length; i++) {
        cube.move(moves_made[0][i - 1]);
        cube_states[i] = cube.get_colors(array_of_6_user_selected_color_ids);
    }
    return [time, resets * max_generations_before_reset + gen_count,
            moves_made, cube_states];
}

/* 2E. instantiate a user cube; global for convenience in interface functions */

var user_cube = new Cube();
user_cube.reset();

/* 3. user interface functions */

var colors = ['t', 'f', 'b', 'g', 'c', 'r'];
var selected_side = 4;

function prevent_use() {
    // prevents use of Rubix by replacing Next button on 1st page with error msg
    document.getElementById('page1_page4_next').innerHTML = 'We can&rsquo;t'
        + ' have more survivors than individuals!<br><br>Please make sure num'
        + '_survivors &#8804; pop_size in the JavaScript code, then Refresh.';
}

/* 3A. step 1 of 3 - select colors */

function select_colors() {
    // called only by clicking/ tapping the Next button on the landing page
    var t = '<td class="palette ';
    var fst = '</td></tr><tr>' + t;
    var br = '</td><td></td><td>';
    var snd = '</td><td></td><td></td><td></td><td></td><td></td><td></td>' + t;
    document.getElementById('heading').innerHTML = '1. Select Colors';
    document.getElementById('instructions').innerHTML = 'A face&rsquo;s color'
        + ' is the color of its center, which cannot move.<br><br><table><tr>'
        + t + 'r">r' + br + 'rose quartz' + snd + 't">t' + br + 'limpet shell'
        + fst + 'p">p' + br + 'peach echo' + snd + 'l">l' + br + 'lilac gray'
        + fst + 's">s' + br + 'serenity' + snd + 'f">f' + br + 'fiesta'
        + fst + 'b">b' + br + 'snorkel blue' + snd + 'i">i' + br + 'iced coffee'
        + fst + 'c">c' + br + 'buttercup' + snd + 'g">g' + br + 'green flash'
        + '</td></tr></table><br>'
        + 'Specify the colors of the six cube faces in the order U (up/ top), R'
        + ' (right), F (front), D (down/ bottom), L (left), and B (back).'
        + '<br><br>Each side should have a unique color from the'
        + ' <a href="http://goo.gl/5UVhdX" target="_blank">palette</a> above.';
    document.getElementById('action').innerHTML = '<input type="text"'
        + ' id="select_colors_txt" value="cfbrtg" onKeyDown="process_colors'
        + '(false)" onKeyUp="process_colors(window.event.keyCode === 13)"/>';
    document.getElementById('select_colors_txt').focus();
    document.getElementById('next').innerHTML = '<input type="button"'
        + ' id="select_colors_button" value="Next" onClick="input_cube()"/>';
    document.getElementById('page1_page4_next').innerHTML = '';
}

function vc(color_codes_str) {
    // validates colors, returns true if valid colors
    if (color_codes_str.length != 6) {
        return false;
    }
    var remaining_options = ['r', 'p', 's', 'b', 'c', 't', 'l', 'f', 'i', 'g'];
    for (var i = color_codes_str.length, found = false; i--; found = false) {
        for (var j = remaining_options.length; j--;) {
            if (color_codes_str[i] === remaining_options[j]) {
                remaining_options[j] = null;
                found = true;
                break;
            }
        }
        if (!found) {
            return false;
        }
    }
    colors = [color_codes_str[4], color_codes_str[1], color_codes_str[2],
              color_codes_str[5], color_codes_str[0], color_codes_str[3]];
    return true;
}

function process_colors(enter_key_pressed_in_select_colors_textbox) {
    // first converts letters in textbox to lowercase, then validates the colors
    if (!vc(document.getElementById('select_colors_txt').value.toLowerCase())) {
        document.getElementById('select_colors_button').disabled = 'disabled';
        return;
    }
    if (!enter_key_pressed_in_select_colors_textbox) {
        document.getElementById('select_colors_button').disabled = '';
        return;
    }
    input_cube();
}

/* 3B. step 2 of 3 - input cube, part 1 of 3 - load cube */

function load_cube(c, user_is_inputting) {
    // c is from get_colors; IDs are for edit_tile(id); 18 rows b/c 3 per side
    var fst = '<td class="';
    var snd = '" onClick="';
    if (user_is_inputting) {
        var center_tile_positions = [4, 22, 25, 28, 31, 49];
        for (var i = 6; i--;) {
            c[center_tile_positions[i]] += ' inputting_center';
        }
        fst += 'inputting ';
        snd += 'edit_tile(';
    }
    var tile_ids = [32, 33, 34, 39, -1, 35, 38, 37, 36,
                    0, 1, 2, 16, 17, 18, 8, 9, 10, 24, 25, 26,
                    7, -1, 3, 23, -1, 19, 15, -1, 11, 31, -1, 27,
                    6, 5, 4, 22, 21, 20, 14, 13, 12, 30, 29, 28,
                    40, 41, 42, 47, -1, 43, 46, 45, 44];
    var trd = user_is_inputting ? ')">' : '">';
    var tiles = ['U1', 'U2', 'U3', 'U4', '&#9418;', 'U5', 'U6', 'U7', 'U8',
                 'L1', 'L2', 'L3', 'F1', 'F2', 'F3', 'R1', 'R2', 'R3',
                 'B1', 'B2', 'B3', 'L4', '&#9409;', 'L5', 'F4', '&#9403;', 'F5',
                 'R4', '&#9415;', 'R5', 'B4', '&#9399;', 'B5', 'L6', 'L7', 'L8',
                 'F6', 'F7', 'F8', 'R6', 'R7', 'R8', 'B6', 'B7', 'B8',
                 'D1', 'D2', 'D3', 'D4', '&#9399;', 'D5', 'D6', 'D7', 'D8'];
    var end = '</td>';
    var rows = new Array(18);
    for (var i = 18; i--;) {
        rows[i] = '';
        for (var j = i * 3; j < (i + 1) * 3; j++) {
            rows[i] += fst + c[j] + snd + tile_ids[j] + trd + tiles[j] + end;
        }
    }
    var row_break = '</tr><tr>';
    var side_placeholder = '<td></td><td></td><td></td><td></td>';
    var up_down_row_break = row_break + side_placeholder;
    var side_break = '</tr><tr></tr><tr>';
    var column_break = '<td></td>';
    var end_table = '</tr></table>';
    var footers = [up_down_row_break, up_down_row_break, side_break + row_break,
                   column_break, column_break, column_break, row_break,
                   column_break, column_break, column_break, row_break,
                   column_break, column_break, column_break,
                   side_break + up_down_row_break, up_down_row_break,
                   up_down_row_break, end_table];
    var cube = '<table class="centered_t"><tr>' + side_placeholder;
    for (var i = 0; i < 18; i++) {
        cube += rows[i] + footers[i];
    }
    document.getElementById('action').innerHTML = cube;
}

function load_user_cube() {
    // panel_solve_button is established in input_cube (next-next function)
    load_cube(user_cube.get_colors(colors), true);
    document.getElementById('panel_solve_button').disabled =
        user_cube.is_valid() ? '' : 'disabled';
}

function edit_tile(tile_id) {
    if (tile_id == -1) {
        return;
    }
    user_cube.change_color(tile_id, selected_side);
    load_user_cube();
    var tile_ids_on_each_side = [8, 9, 10, 20, 21, 28, 29, 30,
                                 14, 15, 16, 24, 25, 34, 35, 36,
                                 11, 12, 13, 22, 23, 31, 32, 33,
                                 17, 18, 19, 26, 27, 37, 38, 39,
                                 0, 1, 2, 3, 4, 5, 6, 7,
                                 40, 41, 42, 43, 44, 45, 46, 47];
    if (tile_ids_on_each_side.indexOf(tile_id) / 8 >> 0 != selected_side) {
        update_panel_side_txt();
    }
}

/* 3C. step 2 of 3 - input cube, part 2 of 3 - load page */

function input_cube() {
    // #action (DOM element b/w #instructions & #next) is loaded in load_cube()
    document.getElementById('heading').innerHTML = '2. Input Cube';
    document.getElementById('instructions').innerHTML = 'Click or tap to paste'
        + ' the selected color, or use the textbox. Centers are fixed, Scramble'
        + ' first resets, and Solve is disabled for <a href="http://goo.gl/'
        + 'UudH61" target="_blank">invalid</a> cubes.<br>';
    document.getElementById('action').innerHTML = '';
    var c = [colors[4], colors[1], colors[2], colors[5], colors[0], colors[3]];
    var sides = [4, 1, 2, 5, 0, 3];
    var fst = '<td class="inputting ';
    var snd = '" id="panel_color_id_';
    var sel = ' selected_side' + snd;
    var trd = '" onClick="change_selected_side(';
    var fth = ')">';
    var br = '</td>';
    var midpt = br + '</tr><tr>';
    var end = br + '</tr></table>';
    var panel_colors = '<table><tr>';
    for (var i = 0; i < 6; i++) {
        panel_colors += fst + c[i] + (!i ? sel : snd) + sides[i] + trd +
            + sides[i] + fth + c[i] + (i == 2 ? midpt : (i == 5 ? end : br));
    }
    sides = ['&#9418;', '&#9415;', '&#9403;', '&#9401;', '&#9409;', '&#9399;'];
    fst = '<option>';
    snd = '</option>';
    var eight_of_up_color = colors[4] + colors[4] + colors[4] + colors[4]
        + colors[4] + colors[4] + colors[4] + colors[4];
    var textbox_and_submit_button = '<td><input type="text" id="panel_side_txt"'
        + ' value="' + eight_of_up_color + '" onKeyDown="process_panel_side_txt'
        + '(false)" onKeyUp="process_panel_side_txt(window.event.keyCode === 13'
        + ')"/></td><td><input type="button" id="panel_side_update" onClick='
        + '"update_side()" value="Update" disabled/></td></tr></table>';
    end = snd + '</select></td>' + textbox_and_submit_button;
    var panel_side = '<table><tr><td><select id="panel_side_select"'
        + ' onChange="change_selected_side(-1)">';
    for (var i = 0; i < 6; i++) {
        panel_side += fst + sides[i] + (i < 5 ? snd : end);
    }
    fst = '<td class="panel_item">';
    snd = '</td>';
    end = snd + '</tr></table>';
    var is_button = '<input type="button" onClick="';
    var panel_reset_button = is_button + 'reset()" value="Reset"/>';
    var panel_scramble_button = is_button + 'scramble()" value="Scramble"/>';
    var panel_solve_button = is_button + 'load_solution()"'
        + ' id="panel_solve_button" value="Solve"/>';
    var panel_items = [panel_colors, panel_side, panel_reset_button,
                       panel_scramble_button, panel_solve_button];
    var panel = '<table class="centered_t"><tr>';
    for (var i = 0; i < 5; i++) {
        panel += fst + panel_items[i] + (i < 4 ? snd : end);
    }
    document.getElementById('next').innerHTML = '<br>' + panel;
    document.getElementById('page1_page2_logo').innerHTML = '';
    load_user_cube();
}

function reset() {
    user_cube.reset();
    load_user_cube();
    update_panel_side_txt();
    document.getElementById('page1_page4_next').innerHTML = '';
}

function scramble() {
    var moves_made = user_cube.randomize();
    load_user_cube();
    update_panel_side_txt();
    document.getElementById('page1_page4_next').innerHTML = moves_made[0].length
        + ' random moves were made: ' + moves_made[1] + '.';
}

/* 3D. step 2 of 3 - input cube, part 3 of 3 - panel functions */

function update_panel_side_txt() {
    document.getElementById('panel_side_txt').value = colors_of_selected_side();
    process_panel_side_txt(false);
}

function colors_of_selected_side() {
    // returns color IDs of selected side
    var c = user_cube.get_colors(colors);
    switch(selected_side) {
        case 0: return c[9]+c[10]+c[11]+c[21]+c[23]+c[33]+c[34]+c[35];
        case 1: return c[15]+c[16]+c[17]+c[27]+c[29]+c[39]+c[40]+c[41];
        case 2: return c[12]+c[13]+c[14]+c[24]+c[26]+c[36]+c[37]+c[38];
        case 3: return c[18]+c[19]+c[20]+c[30]+c[32]+c[42]+c[43]+c[44];
        case 4: return c[0]+c[1]+c[2]+c[3]+c[5]+c[6]+c[7]+c[8];
        default: return c[45]+c[46]+c[47]+c[48]+c[50]+c[51]+c[52]+c[53];
    }
}

function change_selected_side(side_id) {
    if (side_id == selected_side) {
        return;
    }
    var c = [4, 1, 2, 5, 0, 3];
    if (side_id == -1) {
        side_id = c[document.getElementById('panel_side_select').selectedIndex];
        document.getElementById('panel_side_txt').focus();
    }
    document.getElementById(('panel_color_id_' + selected_side)).className =
        'inputting ' + colors[selected_side];
    document.getElementById(('panel_color_id_' + side_id)).className +=
        ' selected_side';
    document.getElementById('panel_side_select').selectedIndex =
        c.indexOf(side_id);
    selected_side = side_id;
    update_panel_side_txt();
}

function vpst(txt) {
    // vpst validates panel_side_text
    if (txt.length != 8 || txt == colors_of_selected_side()) {
        return false;
    }
    for (var i = 8, found = false; i--; found = false) {
        for (var j = 6; j--;) {
            if (txt[i] === colors[j]) {
                found = true;
                break;
            }
        }
        if (!found) {
            return false;
        }
    }
    return true;
}

function process_panel_side_txt(enter_key_pressed_in_panel_side_textbox) {
    if (!vpst(document.getElementById('panel_side_txt').value.toLowerCase())) {
        document.getElementById('panel_side_update').disabled = 'disabled';
        return;
    }
    if (!enter_key_pressed_in_panel_side_textbox) {
        document.getElementById('panel_side_update').disabled = '';
        return;
    }
    update_side();
}

function update_side() {
    var new_s = document.getElementById('panel_side_txt').value.toLowerCase();
    var new_side = [colors.indexOf(new_s[0]) + 1, colors.indexOf(new_s[1]) + 1,
                    colors.indexOf(new_s[2]) + 1, colors.indexOf(new_s[4]) + 1,
                    colors.indexOf(new_s[7]) + 1, colors.indexOf(new_s[6]) + 1,
                    colors.indexOf(new_s[5]) + 1, colors.indexOf(new_s[3]) + 1];
    switch(selected_side) {
        case 0: user_cube.left = new_side; break;
        case 1: user_cube.right = new_side; break;
        case 2: user_cube.front = new_side; break;
        case 3: user_cube.back = new_side; break;
        case 4: user_cube.up = new_side; break;
        default: user_cube.down  = new_side;
    }
    load_user_cube();
}

/* 3E. step 3 of 3 - solve your cube */

function display_move(move_number) {
    // will be set to display moves based on solve data in load_solution()
    return;
}

function load_solution() {
    // solve() returns time, gen_count, moves (id, str, html), and cube states
    var solution = solve(user_cube, colors);
    document.getElementById('heading').innerHTML = '3. Solve Your Cube';
    document.getElementById('instructions').innerHTML = 'A solution was found'
        + ' in ' + solution[1] + ' generations' + (solution[0] < 5 ? '!' : '.')
        + ' It took ' + (solution[0] == 1 ? '1 second' : (solution[0].toFixed(1)
            + ' seconds')) + '.<br><br><table id="solution_table"><tr>'
        + '<td id="solution_moves">' + solution[2][2] + '</td>'
        + '<td id="notation_diagram">Hover over or tap a move for more info.'
        + '</td></td></tr><tr><td></td><td id="notation_source"><a href='
        + '"http://goo.gl/r7B7XZ" target="_blank">Source</a></td></tr></table>';
    document.getElementById('next').innerHTML = '<br>Click or tap'
        + ' <a href="http://goo.gl/MT3jj3" target="_blank">here</a> to learn'
        + ' more about Thistlethwaite&rsquo;s algorithm.<br><br>'
        + 'Please refresh to solve another cube. Thanks for using Rubix!';
    document.getElementById('page1_page4_next').innerHTML = '';
    display_move = function(move_number) {
        document.getElementById('notation_diagram').innerHTML = !move_number ?
            'Hover over or tap a move for more info.' : ('<img src="rubix_'
                + solution[2][0][move_number - 1] + '.gif">');
        load_cube(solution[3][move_number], false);
    }
    display_move(0);
}
