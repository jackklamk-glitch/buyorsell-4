import unittest

import polars as pl

from bos_quant import compute_bos_scores


class BosQuantEngineTest(unittest.TestCase):
    def test_scores_are_deterministic_and_rank_leaders(self):
        quotes = pl.DataFrame(
            [
                {
                    "symbol": "AAA",
                    "price": 24.8,
                    "prev_close": 23.4,
                    "open": 23.8,
                    "volume": 4_500_000,
                    "adv20": 2_200_000,
                    "buy_volume": 2_900_000,
                    "sell_volume": 1_600_000,
                    "foreign_buy_value": 42_000_000_000,
                    "foreign_sell_value": 18_000_000_000,
                    "market_cap": 9_500_000_000_000,
                    "ret_5d": 0.083,
                    "ret_20d": 0.18,
                    "pe": 9.5,
                    "pb": 1.2,
                    "sector_pe": 14.0,
                    "sector_pb": 1.8,
                    "roe": 0.17,
                },
                {
                    "symbol": "BBB",
                    "price": 13.1,
                    "prev_close": 13.4,
                    "open": 13.3,
                    "volume": 1_100_000,
                    "adv20": 1_600_000,
                    "buy_volume": 420_000,
                    "sell_volume": 680_000,
                    "foreign_buy_value": 4_000_000_000,
                    "foreign_sell_value": 17_000_000_000,
                    "market_cap": 6_000_000_000_000,
                    "ret_5d": -0.035,
                    "ret_20d": -0.08,
                    "pe": 19.0,
                    "pb": 2.9,
                    "sector_pe": 13.0,
                    "sector_pb": 1.7,
                    "roe": 0.07,
                },
            ]
        )

        first = compute_bos_scores(quotes)
        second = compute_bos_scores(quotes)

        self.assertEqual(first.to_dicts(), second.to_dicts())
        self.assertEqual(first["symbol"][0], "AAA")
        self.assertGreater(first["s_bos"][0], first["s_bos"][1])
        self.assertTrue(first["s_bos"].is_between(0, 100).all())

    def test_missing_optional_factors_are_neutral_not_guessed(self):
        scored = compute_bos_scores([{"symbol": "AAA", "price": 10.0, "prev_close": 10.0}])

        self.assertEqual(scored["s_bos"][0], 50.0)
        self.assertEqual(scored["data_quality"][0], 0.25)


if __name__ == "__main__":
    unittest.main()
