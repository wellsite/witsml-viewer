using System;
using System.Collections.Generic;

// ReSharper disable UnusedAutoPropertyAccessor.Global

namespace WitsmlExplorer.Api.Models
{
    public class Trajectory : ObjectOnWellbore
    {
        public decimal? MdMin { get; internal set; }
        public decimal? MdMax { get; internal set; }
        public string AziRef { get; internal set; }
        public DateTime? DTimTrajStart { get; internal set; }
        public DateTime? DTimTrajEnd { get; internal set; }
        public List<TrajectoryStation> TrajectoryStations { get; internal set; }
        public DateTime? DateTimeCreation { get; internal set; }
        public DateTime? DateTimeLastChange { get; internal set; }
    }
}
