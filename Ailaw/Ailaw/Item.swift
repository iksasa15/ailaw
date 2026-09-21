//
//  Item.swift
//  Ailaw
//
//  Created by Ahmed on 10/04/1448 AH.
//

import Foundation
import SwiftData

@Model
final class Item {
    var timestamp: Date
    
    init(timestamp: Date) {
        self.timestamp = timestamp
    }
}
