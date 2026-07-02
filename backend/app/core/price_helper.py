"""Helper functions for price and fee calculations."""

from __future__ import annotations


def calculate_steam_receive_price(buyer_price: float | None, currency: str) -> float | None:
    """
    Calculates the amount the seller receives on the Steam Community Market
    from the buyer's price (lowest_price), accounting for Steam fees.
    """
    if buyer_price is None or buyer_price <= 0:
        return None

    if currency == "USD":
        price_cents = int(round(buyer_price * 100))
        min_fee = 1
        low = 0
        high = price_cents
        best_r = 0
        while low <= high:
            mid = (low + high) // 2
            steam_fee = max(min_fee, mid // 20)
            pub_fee = max(min_fee, mid // 10)
            total = mid + steam_fee + pub_fee
            if total <= price_cents:
                best_r = mid
                low = mid + 1
            else:
                high = mid - 1
        return best_r / 100.0
    else:
        # IDR
        min_fee = 179
        low = 0
        high = int(round(buyer_price))
        best_r = 0
        while low <= high:
            mid = (low + high) // 2
            steam_fee = max(min_fee, mid // 20)
            pub_fee = max(min_fee, mid // 10)
            total = mid + steam_fee + pub_fee
            if total <= buyer_price:
                best_r = mid
                low = mid + 1
            else:
                high = mid - 1
        return float(best_r)
