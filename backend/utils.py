"""
Utility functions for timezone handling
"""
from datetime import datetime, timezone, timedelta
from typing import Optional

# O'zbekiston timezone (UTC+5)
UZBEKISTAN_TZ = timezone(timedelta(hours=5))


def get_uzbekistan_now() -> datetime:
    """Get current datetime in Uzbekistan timezone (UTC+5)"""
    return datetime.now(UZBEKISTAN_TZ)


def to_uzbekistan_time(dt: Optional[datetime]) -> Optional[datetime]:
    """Convert datetime to Uzbekistan timezone"""
    if dt is None:
        return None
    
    # If datetime is naive, assume it's UTC
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    
    # Convert to Uzbekistan timezone
    return dt.astimezone(UZBEKISTAN_TZ)


def format_datetime_uz(dt: Optional[datetime], format_str: str = '%d.%m.%Y %H:%M') -> str:
    """Format datetime in Uzbekistan timezone"""
    if dt is None:
        return ''
    
    uz_dt = to_uzbekistan_time(dt)
    return uz_dt.strftime(format_str)

