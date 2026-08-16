//
//  Formatters.swift
//  WesternCreditInstitute
//

import Foundation

nonisolated enum Format {
    /// `$1,250.00`
    static func currency(_ value: Double) -> String {
        value.formatted(.currency(code: "USD").precision(.fractionLength(2)))
    }

    /// `$1,250` — drops cents when the value is whole.
    static func compactCurrency(_ value: Double) -> String {
        if value == value.rounded() {
            return value.formatted(.currency(code: "USD").precision(.fractionLength(0)))
        }
        return currency(value)
    }

    /// `Jan 8, 2025`
    static func mediumDate(_ date: Date) -> String {
        date.formatted(.dateTime.month(.abbreviated).day().year())
    }

    /// `Jan 8`
    static func shortDate(_ date: Date) -> String {
        date.formatted(.dateTime.month(.abbreviated).day())
    }

    static func decimal(_ value: Double, places: Int = 1) -> String {
        value.formatted(.number.precision(.fractionLength(places)))
    }
}
