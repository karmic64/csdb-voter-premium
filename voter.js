//original by pissnelke of penisbruch
//disassembled/recoded by karmic dec 7-8 2024


//////////////////////////////////////// actual vote calculation bits

function get_error_sub(v) {
	var result = 0.0;
	
	while (1) {
		if (v < -10.0) {
			return result;
		} else if (v > 10.0) {
			return result + Math.sqrt(2.0 * Math.PI);
		} else {
			var v2 = v - (1.0 / 10.0 / 2.0);
			v -= (1.0 / 10.0);
			result += Math.exp((v2 * v2) / -2.0) * 0.1;
		}
	}
	
	return result;
}

function get_error(bound, threshold, median) {
	if (threshold === 0.0)
		threshold = 1.0;
	
	return get_error_sub((bound - median) / threshold) / Math.sqrt(2.0 * Math.PI);
}

function get_range_lower(vote_score, threshold, median) {
	const lower = vote_score === 1 ? -100.0 : vote_score - 0.5;
	const upper = vote_score === 10 ? 100.0 : vote_score + 0.5;
	
	return get_error(upper, threshold, median) - get_error(lower, threshold, median);
}

function get_median(vote_counts) {
	const total_vote_count = vote_counts.reduce((acc, vc) => acc + vc, 0);
	
	var median = 0;
	var median_running_total = 0;
	while (median_running_total < (total_vote_count / 2)) {
		median_running_total += vote_counts[median++];
	}
	
	return median;
}

function correct_vote_counts(vote_counts) {
	const total_vote_count = vote_counts.reduce((acc, vc) => acc + vc, 0);
	const median = get_median(vote_counts);
	
	for (let i = 0; i < 10; i++) {
		var range_lower = get_range_lower(i + 1, 3.0, median) * total_vote_count;
		var range_upper = range_lower * (15.0 / 10.0) + (5.0 / 10.0);
		
		if (vote_counts[i] > range_upper) {
			if (total_vote_count >= 10) {
				vote_counts[i] = Math.floor(range_upper);
			} else {
				vote_counts[i] = Math.ceil(range_lower);
			}
		}
	}
	
	return vote_counts;
}

function get_average(vote_counts) {
	var total_vote_count = 0;
	var total_score = 0;
	
	for (let i = 0; i < 10; i++) {
		const count = vote_counts[i];
		total_vote_count += count;
		total_score += count * (i+1);
	}
	
	return total_score / total_vote_count;
}



///////////////////////////////////////////////////// page-related


var votes_inputs = [];
var td_percentages = [];
const fake_stats = document.getElementById('fake-stats');
const full_numbers = document.getElementById('full-numbers');
const possible_votes = document.getElementById('possible-votes');
const best_votes = document.getElementById('best-votes');

for (let i = 1; i <= 10; i++) {
	votes_inputs.push(document.getElementById('votes-' + i.toString()));
	td_percentages.push(document.getElementById('percentage-' + i.toString()));
}

function get_vote_counts() {
	var vote_counts = [];
	
	for (let i = 0; i < 10; i++) {
		vote_counts.push(votes_inputs[i].valueAsNumber || 0);
	}
	
	return vote_counts;
}

function render_results() {
	const vote_counts = get_vote_counts();
	const total_vote_count = vote_counts.reduce((acc, vc) => acc + vc, 0);
	const max_vote_count = vote_counts.reduce((max, vc) => vc > max ? vc : max, 0);
	
	const median = get_median(vote_counts);
	const actual_average = get_average(vote_counts);
	const corrected_vote_counts = correct_vote_counts(vote_counts.slice());
	const weighted_average = get_average(corrected_vote_counts);
	
	var html = total_vote_count.toString();
	html += ' CSDb users have given a weighted average vote of ';
	html += weighted_average.toFixed(1);
	html += ' / 10';
	fake_stats.innerHTML = html;
	
	for (let i = 0; i < 10; i++) {
		const count = vote_counts[i];
		const ratio_to_max = max_vote_count === 0 ? 0 : (count / max_vote_count);
		const ratio_to_total = total_vote_count === 0 ? 0 : (count / total_vote_count);
		
		var html = '<span class="percentage-bar" style="width:';
		html += (Math.floor(ratio_to_max * 200) + 5).toString();
		html += 'px;"></span> '
		html += (ratio_to_total * 100).toFixed(1);
		html += '%'
		td_percentages[i].innerHTML = html;
	}
	
	html = 'Weighted average: ';
	html += weighted_average.toFixed(5);
	html += ' / Actual average: ';
	html += actual_average.toFixed(5);
	html += ' / Median: '
	html += median.toString();
	full_numbers.innerHTML = html;
	
	var best_downvote;
	var best_downvote_score = 11;
	var best_upvote;
	var best_upvote_score = -1;
	
	html = '<table class="actual-table"><thead><th>If you vote</th><th>Weighted average</th><th>Actual average</th><th>Median</th></thead><tbody>'
	for (let i = 0; i < 10; i++) {
		var changed_counts = vote_counts.slice();
		changed_counts[i]++;
	
		const changed_median = get_median(changed_counts);
		const changed_actual_average = get_average(changed_counts);
		const corrected_changed_counts = correct_vote_counts(changed_counts.slice());
		const changed_weighted_average = get_average(corrected_changed_counts);
		
		if (changed_weighted_average < best_downvote_score) {
			best_downvote = i + 1;
			best_downvote_score = changed_weighted_average;
		}
		
		if (changed_weighted_average > best_upvote_score) {
			best_upvote = i + 1;
			best_upvote_score = changed_weighted_average;
		}
		
		html += '<tr><th>';
		html += (i + 1).toString();
		html += '</th><td>'
		html += changed_weighted_average.toFixed(5);
		html += ' (';
		html += (changed_weighted_average - weighted_average).toFixed(5);
		html += ')</td><td>'
		html += changed_actual_average.toFixed(5);
		html += ' (';
		html += (changed_actual_average - actual_average).toFixed(5);
		html += ')</td><td>'
		html += changed_median.toString();
		html += '</td></tr>'
	}
	html += '</tbody></table>'
	possible_votes.innerHTML = html;
	
	html = '';
	if (best_downvote_score === weighted_average) {
		html += "Can't downvote this release";
	} else {
		html += 'To downvote vote ';
		html += best_downvote.toString();
	}
	html += ', '
	if (best_upvote_score === weighted_average) {
		html += "can't upvote this release";
	} else {
		html += 'to upvote vote ';
		html += best_upvote.toString();
	}
	html += '.';
	best_votes.innerHTML = html;
}

render_results();

votes_inputs.forEach((emt) => {
	emt.addEventListener('input', render_results);
});







