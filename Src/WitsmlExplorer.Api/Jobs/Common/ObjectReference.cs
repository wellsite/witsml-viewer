using System.Text;

namespace WitsmlExplorer.Api.Jobs.Common
{
    public class ObjectReference : IReference
    {
        public string WellUid { get; set; }
        public string WellboreUid { get; set; }
        public string Uid { get; set; }
        public string WellName { get; set; }
        public string WellboreName { get; set; }
        public string Name { get; set; }

        public string Description()
        {
            StringBuilder desc = new();
            desc.Append($"WellUid: {WellUid}; ");
            desc.Append($"WellboreUid: {WellboreUid}; ");
            desc.Append($"Uid: {Uid}; ");
            return desc.ToString();
        }

        public string GetObjectName()
        {
            return Name;
        }

        public string GetWellboreName()
        {
            return WellboreName;
        }

        public string GetWellName()
        {
            return WellName;
        }
    }
}
