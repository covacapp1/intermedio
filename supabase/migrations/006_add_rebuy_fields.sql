-- Add rebuy deadline and declined rebuy tracking to room_players
ALTER TABLE room_players 
ADD COLUMN rebuy_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN has_declined_rebuy BOOLEAN DEFAULT FALSE;
