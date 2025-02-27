// utils/states.ts
// This file provides US states data and utility functions for state selection

import { createClient } from '@/utils/supabase/server';

/**
 * Interface representing a US state with abbreviation and full name
 */
export interface USState {
  abbreviation: string;
  fullname: string;
}

/**
 * Static list of US states as fallback if database fetch fails
 */
const US_STATES: USState[] = [
  { abbreviation: 'AL', fullname: 'Alabama' },
  { abbreviation: 'AK', fullname: 'Alaska' },
  { abbreviation: 'AZ', fullname: 'Arizona' },
  { abbreviation: 'AR', fullname: 'Arkansas' },
  { abbreviation: 'CA', fullname: 'California' },
  { abbreviation: 'CO', fullname: 'Colorado' },
  { abbreviation: 'CT', fullname: 'Connecticut' },
  { abbreviation: 'DE', fullname: 'Delaware' },
  { abbreviation: 'FL', fullname: 'Florida' },
  { abbreviation: 'GA', fullname: 'Georgia' },
  { abbreviation: 'HI', fullname: 'Hawaii' },
  { abbreviation: 'ID', fullname: 'Idaho' },
  { abbreviation: 'IL', fullname: 'Illinois' },
  { abbreviation: 'IN', fullname: 'Indiana' },
  { abbreviation: 'IA', fullname: 'Iowa' },
  { abbreviation: 'KS', fullname: 'Kansas' },
  { abbreviation: 'KY', fullname: 'Kentucky' },
  { abbreviation: 'LA', fullname: 'Louisiana' },
  { abbreviation: 'ME', fullname: 'Maine' },
  { abbreviation: 'MD', fullname: 'Maryland' },
  { abbreviation: 'MA', fullname: 'Massachusetts' },
  { abbreviation: 'MI', fullname: 'Michigan' },
  { abbreviation: 'MN', fullname: 'Minnesota' },
  { abbreviation: 'MS', fullname: 'Mississippi' },
  { abbreviation: 'MO', fullname: 'Missouri' },
  { abbreviation: 'MT', fullname: 'Montana' },
  { abbreviation: 'NE', fullname: 'Nebraska' },
  { abbreviation: 'NV', fullname: 'Nevada' },
  { abbreviation: 'NH', fullname: 'New Hampshire' },
  { abbreviation: 'NJ', fullname: 'New Jersey' },
  { abbreviation: 'NM', fullname: 'New Mexico' },
  { abbreviation: 'NY', fullname: 'New York' },
  { abbreviation: 'NC', fullname: 'North Carolina' },
  { abbreviation: 'ND', fullname: 'North Dakota' },
  { abbreviation: 'OH', fullname: 'Ohio' },
  { abbreviation: 'OK', fullname: 'Oklahoma' },
  { abbreviation: 'OR', fullname: 'Oregon' },
  { abbreviation: 'PA', fullname: 'Pennsylvania' },
  { abbreviation: 'RI', fullname: 'Rhode Island' },
  { abbreviation: 'SC', fullname: 'South Carolina' },
  { abbreviation: 'SD', fullname: 'South Dakota' },
  { abbreviation: 'TN', fullname: 'Tennessee' },
  { abbreviation: 'TX', fullname: 'Texas' },
  { abbreviation: 'UT', fullname: 'Utah' },
  { abbreviation: 'VT', fullname: 'Vermont' },
  { abbreviation: 'VA', fullname: 'Virginia' },
  { abbreviation: 'WA', fullname: 'Washington' },
  { abbreviation: 'WV', fullname: 'West Virginia' },
  { abbreviation: 'WI', fullname: 'Wisconsin' },
  { abbreviation: 'WY', fullname: 'Wyoming' },
  { abbreviation: 'DC', fullname: 'District of Columbia' }
];

/**
 * Fetches US states from the database or returns a static list as fallback
 * @returns Promise<USState[]> Array of US states with abbreviation and full name
 */
export async function getUSStates(): Promise<USState[]> {
  try {
    const supabase = createClient();
    
    // Try to fetch states from the database
    const { data, error } = await supabase
      .from('USState')
      .select('abbreviation, fullname')
      .order('fullname', { ascending: true });
    
    if (error || !data || data.length === 0) {
      console.warn('Failed to fetch states from database, using static list:', error);
      return US_STATES;
    }
    
    return data as USState[];
  } catch (error) {
    console.error('Error fetching US states:', error);
    // Return static list as fallback
    return US_STATES;
  }
} 