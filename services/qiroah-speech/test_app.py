import unittest

from app import expected_consonants, final_phone, score_word, short_vowel_score


class SpeechDecisionTests(unittest.TestCase):
    def test_last_phone_is_heard_not_derived_from_written_word(self):
        word = "الطَّالِبُ"
        self.assertEqual(expected_consonants(word), "ltlb")
        self.assertEqual(final_phone(["l", "t", "a", "l", "i", "b", "i"])[0], "i")
        self.assertEqual(final_phone(["l", "t", "a", "l", "i", "b"])[0], "none")
        self.assertIsNone(final_phone(["l", "t", "a", "l", "i", "b", "uu"])[0])
        self.assertIsNone(final_phone(["l", "t", "a", "l", "i", "b", "[UNK]"])[0])
        self.assertEqual(final_phone(["b", "I", "$", "sil"])[0], "i")

    def test_emphatic_vowels_do_not_inflate_confidence(self):
        posterior = {v: 0.0 for v in ("a", "i", "u", "A", "I", "U")}
        posterior.update(a=0.1, I=0.4)
        self.assertLess(short_vowel_score(posterior, "I"), 0.6)
        lower = dict(posterior, I=0.0, i=0.4)
        self.assertEqual(short_vowel_score(posterior, "I"), short_vowel_score(lower, "i"))

    def test_unrelated_word_cannot_supply_a_vowel_verdict(self):
        word = "بِالْقَلَمِ"
        self.assertGreaterEqual(score_word(word, ["b", "l", "q", "l", "m", "i"]), 0.7)
        self.assertLess(score_word(word, ["s", "f", "r", "i"]), 0.7)


if __name__ == "__main__":
    unittest.main()
